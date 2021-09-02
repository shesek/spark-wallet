import LightningClient from 'clightning-client'
import EventEmitter from 'events'
import { fetchRate } from './exchange-rate'
import { attachInvoiceMeta } from './cmd'
import assert from 'assert'

EventEmitter.defaultMaxListeners = 20

const rateInterval = 60000 // 1 minute

module.exports = ln => {
  const lnPoll = LightningClient(ln.rpcPath)
      , em = new EventEmitter

  // Continuously long-poll invoice payment updates
  async function waitany(last_index) {
    try {
      const inv = await lnPoll.waitanyinvoice(last_index)
      await attachInvoiceMeta(lnPoll, inv)
      em.emit('inv-paid', inv)
      waitany(inv.pay_index)
    } catch (err) {
      console.error(err.stack || err.toString())
      setTimeout(_ => waitany(last_index), 10000)
    }
  }

  // Start waitany() with the last known invoice
  lnPoll.client.on('connect', _ =>
    lnPoll.listinvoices()
      .then(r => Math.max(...r.invoices.map(inv => inv.pay_index || 0)))
      .then(waitany))

  // Periodically pull BTC<->USD exchange rate
  let lastRate
  if (fetchRate) {
    (async function getrate() {
      if (em.listenerCount('rate') || !lastRate) {
        // only pull if someone is listening or if we don't have a rate yet
        try { em.emit('rate', lastRate = await fetchRate()) }
        catch (err) { console.error(err.stack || err.toString()) }
        setTimeout(getrate, rateInterval)
      } else {
        // set a shorter interval for the next update check if we skipped this one
        setTimeout(getrate, 10000)
      }
    })()
  }

  const payTracker = new PayStatusTracker(ln)
  ln.on('paying', paystr => payTracker.track(paystr))

  // GET /stream middleware
  return (req, res) => {
    res.set({
      'X-Accel-Buffering': 'no'
    , 'Cache-Control': 'no-cache'
    , 'Content-Type': 'text/event-stream'
    , 'Connection': 'keep-alive'
    }).flushHeaders()

    const write = data => (res.write(data + '\n\n'), res.flush())

    write('retry: 3000')

    const keepAlive = setInterval(_ => write(': keepalive'), 25000)

    const onInvPaid = inv => write(`event:inv-paid\ndata:${ JSON.stringify(inv) }`)
    em.on('inv-paid', onInvPaid)

    const onRate = rate => write(`event:btcusd\ndata:${ JSON.stringify(rate) }`)
    em.on('rate', onRate)
    lastRate && onRate(lastRate)

    const onPayUpdates = pays => write(`event:pay-updates\ndata:${ JSON.stringify(pays) }`)
    payTracker.on('updates', onPayUpdates)

    req.once('end', _ => (em.removeListener('inv-paid', onInvPaid)
                        , em.removeListener('rate', onRate)
                        , payTracker.removeListener('updated', onPayUpdates)
                        , clearInterval(keepAlive)))
  }
}

// Track the status of send payments
class PayStatusTracker extends EventEmitter {
  constructor(ln) {
    super()
    this.ln = ln
    this.timer = null
    this.pendingPays = new Set
  }

  track(paystr) {
    this.pendingPays.add({ paystr, fails: 0 })

    // Allow some time for the payment to show up in `listpays` before updating
    clearInterval(this.timer)
    this.timer = setTimeout(_ => this.update(), 200)
  }

  async update() {
    try {
      this.emit('updates', (await Promise.all([ ...this.pendingPays ].map(async ppay => {
        const pay = (await this.ln._listpays(ppay.paystr)).pays[0]
        if (!pay) {
          if (++ppay.fails > 10) this.pendingPays.delete(ppay)
          return
        }

        if (pay.status != 'pending') {
          assert(pay.status == 'complete' || pay.status == 'failed', `Unexpected pay status ${pay.status} of ${pay.payment_hash}`)
          // Stop tracking payments when they complete or fail
          this.pendingPays.delete(ppay)
        }

        return pay
      }))).filter(Boolean))
    } catch (e) {
      console.warn('pay status update failed:', e)
    }

    if (this.pendingPays.size) {
      this.timer = setTimeout(_ => this.update(), 800)
    }
  }
}