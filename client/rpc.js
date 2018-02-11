import { Observable as O } from 'rxjs'
import nanoid              from 'nanoid'

const ticker = (ms, val) => O.interval(ms).startWith(-1).mapTo(val)

module.exports = ({ scanPay$, confPay$, newInv$, goLogs$ }) => O.merge(
  scanPay$.map(bolt11 => [ 'decodepay', { bolt11 }, bolt11])
, confPay$.map(pay    => [ 'pay', pay, pay.bolt11 ])
, newInv$.map(inv     => [ 'invoice', inv, inv.msatoshi, nanoid(), inv.description ])
, goLogs$.mapTo(         [ 'getlog', {} ] )
, ticker(5000000,        [ 'listinvoices', {} ])
, ticker(5000000,        [ 'listpayments', {} ])
, ticker(5000000,        [ 'listpeers', {} ])
, ticker(5000000,        [ 'listfunds', {} ])
//, fetchInv$.map(label => [ 'listinvoices', label ])
)
