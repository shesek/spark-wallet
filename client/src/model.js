import big from 'big.js'
import { Observable as O } from './rxjs'
import { dbg, formatAmt, recvAmt, combine, combineAvail } from './util'

const
  sumOuts  = outs  => outs.reduce((T, o) => T + o.value, 0)
, sumChans = chans => chans.filter(c => c.state === 'CHANNELD_NORMAL').reduce((T, c) => T + c.msatoshi_to_us, 0)
, sumPeers = peers => peers.filter(p => p.channels).reduce((T, p) => T + sumChans(p.channels), 0)

, updPaidInv = (invs, paid) => invs.map(i => i.label === paid.label ? { ...i, ...paid  } : i)
, appendPay  = (payments, pay) => [ ...payments.filter(p => p.id !== pay.id), pay ]

, idx = xs => x => xs.indexOf(x)
, idn = x => x

const
  themes   = 'cerulean cosmo cyborg dark darkly flatly journal litera lumen lux materia minty pulse sandstone simplex sketchy slate solar spacelab superhero united yeti'.split(' ')
, units    = 'sat bits milli btc usd'.split(' ')
, unitrate = { sat: 0.001, bits: 0.00001, milli: 0.00000001, btc: 0.00000000001 }
, unitstep = { ...unitrate, usd: 0.00001 }

module.exports = ({ dismiss$, togExp$, togTheme$, togUnit$, page$, goRecv$
                  , amtVal$, execRpc$, execRes$, clrHist$, feedStart$, feedShow$, conf$: savedConf$
                  , req$$, error$, invoice$, incoming$, outgoing$, funds$, payments$, invoices$, btcusd$, info$, peers$ }) => {
  const

  // Periodically re-sync from listpayments,
  // continuously patch with known outgoing payments (completed only)
    freshPays$ = O.merge(
      payments$.map(payments => _ => payments)
    , outgoing$.map(pay => payments => payments && appendPay(payments, pay))
    )
    .startWith(null).scan((payments, mod) => mod(payments))
    .map(payments => payments && payments.filter(p => p.status === 'complete'))

  // Periodically re-sync from listinvoices,
  // continuously patch with known invoices (paid only)
  , freshInvs$ = O.merge(
      invoices$.map(invs => _ => invs)
    , invoice$.map(inv  => invs => [ ...invs, inv ])
    , incoming$.map(inv => invs => invs && updPaidInv(invs, inv))
    )
    .startWith(null).scan((invs, mod) => mod(invs))
    .map(invs => invs && invs.filter(inv => inv.status === 'paid'))

  // Chronologically sorted feed of incoming and outgoing payments
  , feed$ = O.combineLatest(freshInvs$, freshPays$, (invoices, payments) => (invoices && payments) && [
      ...invoices.map(i => [ 'in',  i.paid_at,    recvAmt(i), i ])
    , ...payments.map(p => [ 'out', p.created_at, p.msatoshi, p ])
    ].sort((a, b) => b[1] - a[1]))

  // Periodically re-sync channel balance from "listpeers",
  // continuously patch with known incoming & outgoing payments
  , cbalance$ = O.merge(
      peers$.map(peers  => _ => sumPeers(peers))
    , incoming$.map(inv => N => N + inv.msatoshi_received)
    , outgoing$.map(pay => N => N - pay.msatoshi_sent)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  // On-chain outputs balance (not currently used for anything, but seems useful?)
  , obalance$ = funds$.map(funds => sumOuts(funds.outputs || []))

  // Config options
  , conf     = (name, def, list) => savedConf$.first().map(c => c[name] || def).map(list ? idx(list) : idn)
  , expert$  = conf('expert', false)        .concat(togExp$)  .scan(x => !x)
  , theme$   = conf('theme', 'yeti', themes).concat(togTheme$).scan(n => (n+1) % themes.length).map(n => themes[n])
  , unit$    = conf('unit',  'sat',  units) .concat(togUnit$) .scan(n => (n+1) % units.length) .map(n => units[n])
  , conf$    = combine({ expert$, theme$, unit$ })

  // Currency & unit conversion handling
  , msatusd$ = btcusd$.map(rate => big(rate).div(100000000000)).startWith(null)
  , rate$    = O.combineLatest(unit$, msatusd$, (unit, msatusd) => unitrate[unit] || msatusd)
  , unitf$   = O.combineLatest(unit$, rate$, (unit, rate) => msat => `${rate ? formatAmt(msat, rate, unitstep[unit]) : 'n/a'} ${unit}`)

  // Payment amount field handling, shared for creating new invoices and paying custom amounts
  , amtMsat$ = amtVal$.withLatestFrom(rate$, (amt, rate) => amt && rate && big(amt).div(rate).toFixed(0) || '')
                      .merge(page$.mapTo(null)).startWith(null)
  , amtData$ = combine({
      msatoshi: amtMsat$
    , amount:   unit$.withLatestFrom(amtMsat$, rate$, (unit, msat, rate) => formatAmt(msat, rate, unitstep[unit], false))
                     .merge(goRecv$.mapTo(''))
    , unit:     unit$
    , step:     unit$.map(unit => unitstep[unit])
    })

  // Keep track of the number of non-backgground in-flight requests
  , loading$ = req$$.filter(({ request: r }) => !(r.ctx && r.ctx.bg))
      .flatMap(r$ => r$.catch(_ => O.of(null)).mapTo(-1).startWith(+1))
      .startWith(0).scan((N, a) => N+a)

  // User-visible alert messages
  , alert$ = O.merge(
      error$.map(err  => [ 'danger', ''+err ])
    , incoming$.map(i => [ 'success', `Received payment of @{{${recvAmt(i)}}}` ])
    , outgoing$.map(p => [ 'success', `Sent payment of @{{${p.msatoshi}}}` ])
    , dismiss$.mapTo(null)
    ).combineLatest(unitf$, (alert, unitf) => alert && [ alert[0], fmtAlert(alert[1], unitf) ])

  , fmtAlert = (s, unitf) => s.replace(/@\{\{(\d+)\}\}/g, (_, msat) => unitf(msat))

  // RPC console history
  , rpcHist$ = execRes$.startWith([]).merge(clrHist$.mapTo('clear'))
      .scan((xs, x) => x === 'clear' ? [] : [ x, ...xs ].slice(0, 20))

  dbg({ loading$, alert$, rpcHist$ }, 'spark:model')
  dbg({ error$ }, 'spark:error')
  dbg({ savedConf$, conf$, expert$, theme$, unit$, conf$ }, 'spark:config')

  return combineAvail({
    conf$, page$, loading$, alert$
  , info$, peers$, funds$
  , btcusd$, unitf$, cbalance$, obalance$
  , feed$, feedStart$, feedShow$
  , amtData$, rpcHist$
  }).shareReplay(1)
}
