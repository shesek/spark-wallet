import url from 'url'
import { Observable as O } from './rxjs'
import { dropErrors, extractErrors, dbg } from './util'

// send the first requests out all at once, but make sure
// the next one don't all hit the servers at once
const timer = (ms, val) => O.timer(Math.random()*ms, ms).startWith(-1).mapTo(val)


exports.parseRes = ({ HTTP, SSE }) => {
  const reply = category => dropErrors(HTTP.select(category))

  dbg({ reply$: reply().map(r => [ r.request.category, r.body, r.request ]) }, 'spark:reply')

  return {
    req$$:     HTTP.select()
  , error$:    extractErrors(HTTP.select())

  // periodic updates
  , info$:     reply('getinfo').map(r => r.body)
  , funds$:    reply('listfunds').map(r => r.body)
  , peers$:    reply('listpeers').map(r => r.body.peers)
  , payments$: reply('listpayments').map(r => r.body.payments)
  , invoices$: reply('listinvoices').map(r => r.body.invoices)
  , btcusd$:   SSE('btcusd')

  // replies to actions
  , payreq$:   reply('decodepay').map(r => ({ ...r.body, ...r.request.ctx }))
  , invoice$:  reply('invoice').map(r => ({ ...r.body, ...r.request.ctx }))
  , outgoing$: reply('pay').map(r => ({ ...r.body, ...r.request.ctx }))
  , incoming$: SSE('waitany')
  , execRes$:  reply('console').map(({ body, request: { send } }) => ({ ...send, res: body.help || body }))
  , logs$:     reply('getlog').map(r => r.body.log)
  }
}

exports.makeReq = ({ viewPay$, confPay$, newInv$, goLogs$, execRpc$ }) => O.merge(
  viewPay$.map(bolt11 => [ 'decodepay', [ bolt11 ], { bolt11 } ])
, confPay$.map(pay    => [ 'pay',       [ pay.bolt11 ], pay ])
, newInv$.map(inv     => [ 'invoice',   [ inv.msatoshi, inv.label, inv.description ], inv ])
, goLogs$.mapTo(         [ 'getlog' ] )

, timer(60000,           [ 'listinvoices', [], { bg: true } ])
, timer(60000,           [ 'listinvoices', [], { bg: true } ])
, timer(60000,           [ 'listpayments', [], { bg: true } ])
, timer(60000,           [ 'listpeers',    [], { bg: true } ])
, timer(60000,           [ 'listfunds',    [], { bg: true } ])
, timer(60000,           [ 'getinfo',      [], { bg: true } ])

, execRpc$.map(([ method, ...params ]) => [ method, params, { category: 'console' }])
)

exports.toHttp = (rpc$, server$) =>
  rpc$.withLatestFrom(server$.filter(x => x != null)
  , ([ method, params=[], ctx={} ], server) => ({
      category: ctx.category || method
    , method: 'POST'
    , url: url.resolve(server, 'rpc')
    , send: { method, params }
    , ctx
    })
  )
