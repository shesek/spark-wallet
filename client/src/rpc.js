import url from 'url'
import { Observable as O } from './rxjs'
import { dropErrors, extractErrors, formatError, dbg } from './util'

const INVOICE_TTL = 18000 // 5 hours

// send the 1st tick immediately, randomize the 2nd, then send every `ms`
// (so that requests won't hit the server all at once)
const timer = ms => O.timer(Math.random()*ms, ms).startWith(-1)

// Parse incoming RPC replies
// RPC commands prefixed with an '_' are custom extensions provided by the Spark server
exports.parseRes = ({ HTTP, SSE }) => {
  const reply = category => dropErrors(HTTP.select(category))

  dbg({ reply$: reply().map(r => [ r.request.category, r.body, r.request ]) }, 'spark:reply')

  const
    paydetail$ = reply('_decodecheck').map(r => ({ ...r.request.ctx, ...r.body }))
  , offerpay$ = reply('_fetchinvoicepay').map(r => r.body)

  return {
    req$$:     HTTP.select()
  , error$:    extractErrors(HTTP.select()).map(formatError)

  // periodic updates
  , info$:     reply('getinfo').map(r => r.body)
  , peers$:    reply('listpeers').map(r => r.body.peers)
  , payments$: reply('_listpays').map(r => r.body.pays)
  , invoices$: reply('_listinvoices').map(r => r.body.invoices)
  , funds$:    reply('listfunds').map(r => r.body)
  , lnconfig$: reply('_listconfigs').map(r => r.body)

  // replies to actions
  , payreq$:   paydetail$.filter(d => d.type == 'bolt11 invoice' || d.type == 'bolt12 invoice')
                         .merge(offerpay$.filter(t => t.action == 'reconfirm'))
  , offer$:    paydetail$.filter(d => d.type == 'bolt12 offer')
  , invoice$:  reply('invoice').map(r => ({ ...r.body, ...r.request.ctx }))
  , outgoing$: reply('pay').map(r => ({ ...r.body, ...r.request.ctx }))
                           .merge(offerpay$.filter(t => t.action == 'paid'))
  , sinvoice$: reply('sendinvoice').map(r => r.body)
  , localOffer$: reply('offer').map(r => ({ ...r.body, ...r.request.ctx }))
  , newaddr$:  reply('newaddr').map(r => [ r.body, r.request.send.params[0] ])
                               .map(([ b, type ]) => ({ type, address: b[type] || b.address }))
  , funded$:   reply('_connectfund').map(r => r.body)
  , closed$:   reply('_close').map(r => r.body)
  , execRes$:  reply('console').map(r => ({ ...r.request.send, res: r.body }))
  , logs$:     reply('getlog').map(r => ({ ...r.body, log: r.body.log.slice(-200) }))

  // push updates via server-sent events
  , incoming$: SSE('inv-paid')
  , btcusd$:   SSE('btcusd')
  }
}

// RPC commands to send
exports.makeReq = ({ viewPay$, confPay$, offerPay$, offerRecv$, newInv$, goLogs$, goChan$, goNewChan$, goDeposit$, updChan$, openChan$, closeChan$, execRpc$ }) => O.merge(

  // initiated by user actions
  viewPay$.map(paystr => [ '_decodecheck',     [ paystr ], { paystr } ])
, confPay$.map(pay    => [ 'pay',              [ pay.paystr, pay.custom_msat ], pay ])
, newInv$.map(inv => !inv.reusable_offer
                       ? [ 'invoice',          [ inv.msatoshi, inv.label, inv.description, INVOICE_TTL ], inv ]
                       : [ 'offer',            [ inv.msatoshi, inv.description, null, inv.label ], inv ])
, offerPay$.map(pay   => [ '_fetchinvoicepay', [ pay.paystr, pay.custom_msat, pay.quantity, pay.payer_note ] ])
, offerRecv$.map(recv => [ 'sendinvoice',      [ recv.paystr, recv.label ] ])

, goLogs$.mapTo(         [ 'getlog' ] )

, updChan$.mapTo(        [ 'listpeers' ] )
, openChan$.map(d     => [ '_connectfund', [ d.nodeuri, d.channel_capacity_sat, d.feerate ] ])
, closeChan$.map(d    => [ '_close',       [ d.peerid, d.chanid ] ])

, goDeposit$.map(type => [ 'newaddr',   [ type ] ])

  // requested once
, O.of(                  [ '_listconfigs', [], { bg: true } ])

  // periodic updates
, timer(60000).mapTo(    [ '_listinvoices', [], { bg: true } ])
, timer(60000).mapTo(    [ '_listpays',    [], { bg: true } ])
, timer(60000).mapTo(    [ 'getinfo',      [], { bg: true } ])
, timer(60000).merge(goChan$).throttleTime(2000)
              .mapTo(    [ 'listpeers',    [], { bg: true } ])
, timer(60000).merge(goNewChan$).merge(goDeposit$).throttleTime(2000)
              .mapTo(    [ 'listfunds',    [], { bg: true } ])

// also send a "getinfo" ping whenever the window regains focus, to check
// for server connectivity and quickly hide/show the "connection lost" message
// @XXX mobile chrome fails with "ERR_NETWORK_CHANGED" w/o the delay()
, O.fromEvent(window, 'focus').delay(100).mapTo([ 'getinfo', [], { bg: true } ])

, execRpc$.map(([ method, ...params ]) => [ method, params, { category: 'console' }])
)

exports.toHttp = (serverInfo, rpc$) => rpc$.map(([ method, params=[], ctx={} ]) => ({
  category: ctx.category || method
, method: 'POST'
, url: url.resolve(serverInfo.serverUrl, 'rpc')
, send: { method, params }
, headers: { 'X-Requested-With': 'spark-rpc', 'X-Access': serverInfo.accessKey }
, ctx
}))
