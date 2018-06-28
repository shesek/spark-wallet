import LightningClient from 'lightning-client'
import EventEmitter from 'events'
import { get } from 'superagent'

const rateUrl = 'https://www.bitstamp.net/api/v2/ticker/btcusd'
    , rateInterval = 300000 // 5 minutes

module.exports = lnPath => {
  const ln = LightningClient(lnPath)
      , em = new EventEmitter

  // Continuously long-poll invoice payment updates
  async function waitany(last_index) {
    try {
      const inv = await ln.waitanyinvoice(last_index)
      em.emit('waitany', inv)
      waitany(inv.pay_index)
    } catch (err) {
      console.error(err.stack || err.toString())
      setTimeout(_ => waitany(last_index), 10000)
    }
  }

  // Start waitany() with the last known invoice
  ln.client.on('connect', _ =>
    ln.listinvoices()
      .then(r => Math.max(...r.invoices.map(inv => inv.pay_index || 0)))
      .then(waitany))

  // Periodically pull BTC<->USD exchange rate
  let lastRate
  ;(async function getrate() {
    if (em.listenerCount('rate') || !lastRate) {
      // only pull if someone is listening or if we don't have a rate yet
      try { em.emit('rate', lastRate = await get(rateUrl).then(r => r.body.last)) }
      catch (err) { console.error(err.stack || err.toString()) }
      setTimeout(getrate, rateInterval)
    } else {
      // set a shorter interval for the next update check if we skipped this one
      setTimeout(getrate, 10000)
    }
  })()

  // GET /stream middleware
  return (req, res) => {
    res.set({
      'X-Accel-Buffering': 'no'
    , 'Cache-Control': 'no-cache'
    , 'Content-Type': 'text/event-stream'
    , 'Connection': 'keep-alive'
    }).flushHeaders()

    res.write('retry: 3000\n\n')

    const keepAlive = setInterval(_ => res.write(': keepalive\n\n'), 25000)

    const onPay = inv => res.write(`event:waitany\ndata:${ JSON.stringify(inv) }\n\n`)
    em.on('waitany', onPay)

    const onRate = rate => res.write(`event:btcusd\ndata:${ JSON.stringify(rate) }\n\n`)
    em.on('rate', onRate)
    lastRate && onRate(lastRate)

    req.on('close', _ => (em.removeListener('waitany', onPay)
                        , em.removeListener('rate', onRate)
                        , clearInterval(keepAlive)))
  }
}
