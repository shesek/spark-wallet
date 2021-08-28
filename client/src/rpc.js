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
    payDetail$ = reply('_decodecheck').map(r => ({ ...r.request.ctx, ...r.body }))
  , offerInv$ = reply('_fetchinvoice').map(r => r.body)

  // Present fetched invoices with changes for re-confirmation
  // Invoices when no changes are paid automatically (via intent)
  , offerReconf$ = offerInv$.filter(inv => Object.keys(inv.changes).length > 0)

  return {
    req$$:     HTTP.select()
  , error$:    extractErrors(HTTP.select()).map(formatError)

  // Periodic updates
  , info$:     reply('getinfo').map(r => r.body)
  , peers$:    reply('listpeers').map(r => r.body.peers)
  , payments$: reply('_listpays').map(r => r.body.pays)
  , invoices$: reply('_listinvoices').map(r => r.body.invoices)
  , funds$:    reply('listfunds').map(r => r.body)
  , lnconfig$: reply('_listconfigs').map(r => r.body)

  // Replies to actions
  , payreq$:   payDetail$.filter(d => d.type == 'bolt11 invoice' || d.type == 'bolt12 invoice')
                         .merge(offerReconf$)
  , offer$:    payDetail$.filter(d => d.type == 'bolt12 offer')
  , invoice$:  reply('invoice').map(r => ({ ...r.body, ...r.request.ctx }))
  , outgoing$: reply('_pay').map(r => ({ ...r.body, ...r.request.ctx.pay }))
  , offerInv$
  , sinvoice$: reply('sendinvoice').map(r => r.body)
  , localOffer$: reply('offer').map(r => ({ ...r.body, ...r.request.ctx }))
  , newaddr$:  reply('newaddr').map(r => r.body)
  , funded$:   reply('_connectfund').map(r => r.body)
  , closed$:   reply('_close').map(r => r.body)
  , execRes$:  reply('console').map(r => ({ ...r.request.send, res: r.body }))
  , logs$:     reply('getlog').map(r => ({ ...r.body, log: r.body.log.slice(-200) }))

  // Push updates via server-sent events
  , incoming$: SSE('inv-paid')
  , payupdates$: SSE('pay-updates')
  , btcusd$:   SSE('btcusd')
  }
}

// RPC commands to send
exports.makeReq = ({ viewPay$, confPay$, offerPay$, offerRecv$, newInv$, goLogs$, goChan$, goNewChan$, goDeposit$, updChan$, openChan$, closeChan$, execRpc$ }) => O.merge(

  // Initiated by user actions
  viewPay$.map(paystr => [ '_decodecheck',     [ paystr ], { paystr } ])
, confPay$.map(pay    => [ '_pay',             [ pay.paystr, pay.custom_msat ], { pay, bg: true } ])
, newInv$.map(inv => !inv.reusable_offer
                       ? [ 'invoice',          [ inv.msatoshi, inv.label, inv.description, INVOICE_TTL ], inv ]
                       : [ 'offer',            [ inv.msatoshi, inv.description, null, inv.label ], inv ])
, offerPay$.map(pay   => [ '_fetchinvoice',    [ pay.paystr, pay.custom_msat, pay.quantity, pay.payer_note ] ])
, offerRecv$.map(recv => [ 'sendinvoice',      [ recv.paystr, recv.label ] ])

, goLogs$.mapTo(         [ 'getlog' ] )

, updChan$.mapTo(        [ 'listpeers' ] )
, openChan$.map(d     => [ '_connectfund', [ d.nodeuri, d.channel_capacity_sat, d.feerate ] ])
, closeChan$.map(d    => [ '_close',       [ d.peerid, d.chanid ] ])

, goDeposit$.mapTo(      [ 'newaddr',      [ 'all' ] ])

  // Requested once
, O.of(                  [ '_listconfigs', [], { bg: true } ])

  // Periodic updates
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
