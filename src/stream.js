import LightningClient from 'lightning-client'
import EventEmitter from 'events'
import request from 'superagent'

// a proxy server can be specified using standard env variables (http(s)_proxy / all_proxy),
// see github.com/Rob--W/proxy-from-env for details
require('superagent-proxy')(request)

const rateInterval = 60000 // 1 minute

const rateProviders = {
  bitstamp: {
    url: 'https://www.bitstamp.net/api/v2/ticker/btcusd'
  , parser: r => r.body.last
  }

, wasabi: {
    url: 'http://wasabiukrxmkdgve5kynjztuovbg43uxcbcxn6y2okcrsg7gb6jdmbad.onion/api/v3/btc/Offchain/exchange-rates'
  , parser: r => r.body[0].rate
  }
}

const rateProvider = rateProviders[process.env.RATE_PROVIDER || 'bitstamp']

if (!rateProvider) throw new Error('Invalid rate provider')

const fetchRate = _ =>
  request.get(rateProvider.url)
    .type('json')
    .proxy()
    .then(rateProvider.parser)

module.exports = lnPath => {
  const ln = LightningClient(lnPath)
      , em = new EventEmitter

  // Continuously long-poll invoice payment updates
  async function waitany(last_index) {
    try {
      const inv = await ln.waitanyinvoice(last_index)
      em.emit('payment', inv)
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
      try { em.emit('rate', lastRate = await fetchRate()) }
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

    const write = data => (res.write(data + '\n\n'), res.flush())

    write('retry: 3000')

    const keepAlive = setInterval(_ => write(': keepalive'), 25000)

    const onPay = inv => write(`event:inv-paid\ndata:${ JSON.stringify(inv) }`)
    em.on('payment', onPay)

    const onRate = rate => write(`event:btcusd\ndata:${ JSON.stringify(rate) }`)
    em.on('rate', onRate)
    lastRate && onRate(lastRate)

    req.once('end', _ => (em.removeListener('payment', onPay)
                        , em.removeListener('rate', onRate)
                        , clearInterval(keepAlive)))
  }
}
