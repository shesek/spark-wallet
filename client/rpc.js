import { Observable as O } from 'rxjs'

const timer = (ms, val) => O.timer(Math.random()*10000, ms).startWith(-1).mapTo(val)

module.exports = ({ scanPay$, confPay$, newInv$, goLogs$ }) => O.merge(
  scanPay$.map(bolt11 => [ 'decodepay', { bolt11 }, bolt11])
, confPay$.map(pay    => [ 'pay', pay, pay.bolt11 ])
, newInv$.map(inv     => [ 'invoice', inv, inv.msatoshi, inv.label, inv.description ])
, goLogs$.mapTo(         [ 'getlog' ] )

, timer(150000,          [ 'listinvoices' ])
, timer(150000,          [ 'listpayments' ])
, timer(150000,          [ 'listfunds' ])
, timer(150000,          [ 'listpeers' ]) // @XXX UNUSED
, timer(150000,          [ 'getinfo' ])

// @TODO on page focus, on homepage load, on refresh button click

//, fetchInv$.map(label => [ 'listinvoices', label ])
)
