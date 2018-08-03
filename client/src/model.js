import big from 'big.js'
import { Observable as O } from './rxjs'
import { dbg, formatAmt, recvAmt, combine, isConnError } from './util'

const msatbtc = big(100000000000) // msat in 1 btc

const
  sumChans = chans => chans.filter(c => c.state === 'CHANNELD_NORMAL').reduce((T, c) => T + c.msatoshi_to_us, 0)
, sumPeers = peers => peers.filter(p => p.channels).reduce((T, p) => T + sumChans(p.channels), 0)

, fmtAlert = (s, unitf) => s.replace(/@\{\{(\d+)\}\}/g, (_, msat) => unitf(msat))

, appendInv = (invs, inv)     => [ ...invs.filter(    i => i.label !== inv.label), inv ]
, appendPay = (payments, pay) => [ ...payments.filter(p => p.id    !== pay.id)   , pay ]

, idx = xs => x => xs.indexOf(x)
, idn = x => x

const
  themes   = 'cerulean cosmo cyborg dark flatly lumen lux materia sandstone simplex slate solar spacelab superhero united yeti'.split(' ')
, units    = 'sat bits milli btc usd'.split(' ')
, unitprec = { sat: 3, bits: 5, milli: 8, btc: 11, usd: 6 }
, unitrate = { sat: 0.001, bits: 0.00001, milli: 0.00000001, btc: 0.00000000001 }
, unitstep = { ...unitrate, usd: 0.000001 }

module.exports = ({ dismiss$, togExp$, togTheme$, togUnit$, page$, goHome$, goRecv$
                  , amtVal$, execRpc$, execRes$, clrHist$, feedStart$: feedStart_$, togFeed$, conf$: savedConf$
                  , req$$, error$, invoice$, incoming$, outgoing$, payments$, invoices$, btcusd$, info$, peers$ }) => {
  const

  // Config options
    conf     = (name, def, list) => savedConf$.first().map(c => c[name] || def).map(list ? idx(list) : idn)
  , expert$  = conf('expert', false)        .concat(togExp$)  .scan(x => !x)
  , theme$   = conf('theme', 'yeti', themes).concat(togTheme$).scan(n => (n+1) % themes.length).map(n => themes[n])
  , unit$    = conf('unit',  'sat',  units) .concat(togUnit$) .scan(n => (n+1) % units.length) .map(n => units[n])
  , conf$    = combine({ expert$, theme$, unit$ })

  // Currency & unit conversion handling
  , msatusd$ = btcusd$.map(rate => big(rate).div(msatbtc)).startWith(null)
  , rate$    = O.combineLatest(unit$, msatusd$, (unit, msatusd) => unitrate[unit] || msatusd)
  , unitf$   = O.combineLatest(unit$, rate$, (unit, rate) => msat => `${rate ? formatAmt(msat, rate, unitprec[unit]) : 'n/a'} ${unit}`)

  // Keep track of connection status
  , connected$ = req$$.flatMap(r$ => r$.mapTo(true).catch(_ => O.empty()))
      .merge(error$.filter(isConnError).mapTo(false))
      .startWith(false)
      .distinctUntilChanged()

  // Keep track of the number of user-initiated in-flight HTTP requests
  , inflight$ = req$$.filter(({ request: r }) => !(r.ctx && r.ctx.bg))
      .flatMap(r$ => r$.catch(_ => O.of(null)).mapTo(-1).startWith(+1))
      .startWith(0).scan((N, a) => N+a)

  // Is all the initial state necessary for the app ready?
  , initLoaded$ = O.combineLatest(...[ info$, peers$, payments$, invoices$ ].map(x$ => x$.startWith(null))
    , (info, peers, payments, invs) => !!(info && peers && payments && invs))

  // Show loading indicator if we have active in-flight requests,
  // OR when (the init state is still missing AND we don't have an error to show)
  , loading$ = O.combineLatest(inflight$, initLoaded$, error$.startWith(null)
    , (inflight, initLoaded, error) => inflight || (!initLoaded && !error))

  // User-visible alert messages
  , alert$ = O.merge(
      error$.map(err  => [ 'danger', ''+err ])
    , incoming$.map(i => [ 'success', `Received payment of @{{${recvAmt(i)}}}` ])
    , outgoing$.map(p => [ 'success', `Sent payment of @{{${p.msatoshi}}}` ])
    , dismiss$.mapTo(null)
    )
    // hide "connection lost" errors when we get back online
    .combineLatest(connected$, (alert, conn) => alert && (isConnError(alert[1]) && conn ? null : alert))
    // format msat amounts in messages
    .combineLatest(unitf$, (alert, unitf) => alert && [ alert[0], fmtAlert(alert[1], unitf) ])
    .startWith(null)

  // Periodically re-sync channel balance from "listpeers",
  // continuously patch with known incoming & outgoing payments
  , cbalance$ = O.merge(
      peers$.map(peers  => _ => sumPeers(peers))
    , incoming$.map(inv => N => N + inv.msatoshi_received)
    , outgoing$.map(pay => N => N - pay.msatoshi_sent)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  // Periodically re-sync from listpayments,
  // continuously patch with known outgoing payments (completed only)
  , freshPays$ = O.merge(
      payments$.map(payments => _ => payments)
    , outgoing$.map(pay => payments => payments && appendPay(payments, pay))
    )
    .startWith(null).scan((payments, mod) => mod(payments))
    .filter(payments => !!payments)
    .map   (payments => payments.filter(p => p.status === 'complete'))
    .distinctUntilChanged((prev, next) => prev.length === next.length)

  // Periodically re-sync from listinvoices,
  // continuously patch with known invoices (paid only)
  , freshInvs$ = O.merge(
      invoices$.map(invs => _ => invs)
    , invoice$.map(inv  => invs => invs && [ ...invs, inv ])
    , incoming$.map(inv => invs => invs && appendInv(invs, inv))
    )
    .startWith(null).scan((invs, mod) => mod(invs))
    .filter(invs => !!invs)
    .map(invs    => invs.filter(inv => inv.status === 'paid'))
    .distinctUntilChanged((prev, next) => prev.length === next.length)

  // Chronologically sorted feed of incoming and outgoing payments
  , feed$ = O.combineLatest(freshInvs$, freshPays$, (invoices, payments) => [
      ...invoices.map(i => [ 'in',  i.paid_at,    recvAmt(i), i ])
    , ...payments.map(p => [ 'out', p.created_at, p.msatoshi, p ])
    ].sort((a, b) => b[1] - a[1]))

  // Collapsed payment/invoice on home feed list
  , feedActive$ = togFeed$.merge( // display feed items manually toggled by the user, and...
      incoming$.map(inv => `in-${inv.pay_index}`) // auto display incoming payments
    , outgoing$.map(pay => `out-${pay.id}`) // auto display outgoing payments
    , feedStart_$.mapTo(null) // reset on feed paging
    , goHome$.filter(p => p.search != '?r').mapTo(null) // reset on home navigation (unless auto-redirected)
    ).startWith(null).scan((S, fid) => S == fid ? null : fid) // clicking the visible feed item again toggles it off

  // Start index for home feed based on user page navigation + reset on home nav
  , feedStart$ = feedStart_$.merge(goHome$.mapTo(0))

  // Payment amount field handling (shared for creating new invoices and paying custom amounts)
  , amtMsat$ = amtVal$.withLatestFrom(rate$, (amt, rate) => amt && rate && big(amt).div(rate).toFixed(0) || '')
                      .merge(page$.mapTo(null)).startWith(null)
  , amtData$ = combine({
      msatoshi: amtMsat$
    , amount:   unit$.withLatestFrom(amtMsat$, rate$, (unit, msat, rate) => formatAmt(msat, rate, unitprec[unit], false))
                     .merge(goRecv$.mapTo(''))
    , unit:     unit$
    , step:     unit$.map(unit => unitstep[unit])
    })

  // RPC console history
  , rpcHist$ = execRes$.startWith([]).merge(clrHist$.mapTo('clear'))
      .scan((xs, x) => x === 'clear' ? [] : [ x, ...xs ].slice(0, 20))

  dbg({ loading$, connected$, alert$, rpcHist$, freshPays$, freshInvs$, feed$, feedStart$, feedActive$ }, 'spark:model')
  dbg({ error$ }, 'spark:error')
  dbg({ savedConf$, conf$, expert$, theme$, unit$, conf$ }, 'spark:config')

  return combine({
    conf$, page$, loading$, alert$
  , unitf$, cbalance$, rate$
  , info$: info$.startWith(null), peers$: peers$.startWith(null)
  , feed$: feed$.startWith(null), feedStart$, feedActive$
  , amtData$, rpcHist$
  , msatusd$, btcusd$: btcusd$.startWith(null)
  }).shareReplay(1)
}
