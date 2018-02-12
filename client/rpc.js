import { Observable as O } from 'rxjs'
import nanoid              from 'nanoid'

const ticker = (ms, val) => O.interval(ms).startWith(-1).mapTo(val)

module.exports = ({ scanPay$, confPay$, newInv$, goLogs$ }) => O.merge(
  scanPay$.map(bolt11 => [ 'decodepay', { bolt11 }, bolt11])
, confPay$.map(pay    => [ 'pay', pay, pay.bolt11 ])
, newInv$.map(inv     => [ 'invoice', inv, inv.msatoshi, nanoid(), inv.description ])
, goLogs$.mapTo(         [ 'getlog', {} ] )
, O.timer(0, 500000).mapTo([ 'listinvoices', {} ])
, O.timer(500, 5000000).mapTo([ 'listpayments', {} ])
, O.timer(1000, 5000000).mapTo([ 'listpeers', {} ])
, O.timer(1500, 5000000).mapTo([ 'listfunds', {} ])
//, fetchInv$.map(label => [ 'listinvoices', label ])
)
