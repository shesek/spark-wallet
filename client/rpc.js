import { Observable as O } from './rxjs'
import { dropErrors, extractErrors, dbg } from './util'

const timer = (ms, val) => O.timer(Math.random()*10000, ms).startWith(-1).mapTo(val)

exports.rpcIntent = ({ HTTP, SSE }) => {
  const reply = category => dropErrors(HTTP.select(category))

  dbg({ reply$: reply().map(r => [ r.request.category, r.body, r.request ]) }, 'flash:reply')

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

exports.rpcCalls = ({ viewPay$, confPay$, newInv$, goLogs$, execRpc$ }) => O.merge(
  viewPay$.map(bolt11 => [ 'decodepay', [ bolt11 ], { bolt11 } ])
, confPay$.map(pay    => [ 'pay',       [ pay.bolt11 ], pay ])
, newInv$.map(inv     => [ 'invoice',   [ inv.msatoshi, inv.label, inv.description ], inv ])
, goLogs$.mapTo(         [ 'getlog' ] )

, execRpc$.map(([ method, ...params ]) => [ method, params, { category: 'console' }])

, timer(150000,          [ 'listinvoices', [], { bg: true } ])
, timer(150000,          [ 'listinvoices', [], { bg: true } ])
, timer(150000,          [ 'listpayments', [], { bg: true } ])
, timer(150000,          [ 'listpeers',    [], { bg: true } ])
, timer(150000,          [ 'listfunds',    [], { bg: true } ])
, timer(150000,          [ 'getinfo',      [], { bg: true } ])

// @TODO on page focus, on homepage load, on refresh button click
)
