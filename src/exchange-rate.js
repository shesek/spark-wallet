import request from 'superagent'

// a proxy server can be specified using standard env variables (http(s)_proxy / all_proxy),
// see github.com/Rob--W/proxy-from-env for details
require('superagent-proxy')(request)

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

if (!process.env.NO_RATES) {
  const rateProvider = rateProviders[process.env.RATE_PROVIDER || 'bitstamp']
  if (!rateProvider) throw new Error('Invalid rate provider')

  exports.fetchRate = _ =>
    request.get(rateProvider.url)
      .type('json')
      .proxy()
      .then(rateProvider.parser)
}
