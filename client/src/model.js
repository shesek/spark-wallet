import big from 'big.js'
import { Observable as O } from './rxjs'
import { dbg, getChannels, formatAmt, recvAmt, parsePayment, combine, isConnError, only } from './util'

const msatbtc = big(100000000000) // msat in 1 btc

const
  sumChans = chans =>
    chans.filter(c => c.chan.state === 'CHANNELD_NORMAL')
         .reduce((T, c) => T + c.chan.to_us_msat, 0)

, sumOuts = outs =>
    outs.filter(o => o.status === 'confirmed')
        .reduce((T, o) => T + o.amount_msat, 0)

, fmtAlert = (s, unitf) => s.replace(/@\{\{(\d+)\}\}/g, (_, msat) => unitf(msat))

, idx = xs => x => xs.indexOf(x)
, idn = x => x

const
  themes   = 'cerulean cosmo cyborg dark flatly lumen lux materia sandstone simplex slate solar spacelab superhero united yeti'.split(' ')
, units    = 'sat bits milli BTC euro'.split(' ')
, unitprec = { sat: 3, bits: 5, milli: 8, BTC: 11, euro: 2 }
, unitrate = { sat: 0.001, bits: 0.00001, milli: 0.00000001, BTC: 0.00000000001 }
, unitstep = { ...unitrate, euro: 0.01 }

module.exports = ({ dismiss$, togExp$, togTheme$, togUnit$, page$, goHome$, goRecv$, goChan$, confPay$
                  , amtVal$, execRes$, clrHist$, feedStart$: feedStart_$, togFeed$, togChan$, togAddrType$
                  , fundMaxChan$
                  , conf$: savedConf$
                  , req$$, error$, payreq$, incoming$, payResult$, payments$, invoices$, funds$, payUpdates$
                  , funded$, closed$
                  , offer$, offerPayQuantity$: offerPayQuantityInput$, invUseOffer$
                  , btceuro$, info$, lnconfig$, peers$ }) => {
  const

  // Config options
    conf     = (name, def, list) => savedConf$.first().map(c => c[name] || def).map(list ? idx(list) : idn)
  , expert$  = conf('expert', false)        .concat(togExp$)  .scan(x => !x)
  , theme$   = conf('theme', 'dark', themes).concat(togTheme$).scan(n => (n+1) % themes.length).map(n => themes[n])
  , unit$    = conf('unit',  'bits',  units).concat(togUnit$) .scan(n => (n+1) % units.length) .map(n => units[n])
  , conf$    = combine({ expert$, theme$, unit$ })

  // Currency & unit conversion handling
  , msateuro$ = btceuro$.map(rate => big(rate).div(msatbtc)).startWith(null)
  , rate$    = O.combineLatest(unit$, msateuro$, (unit, msateuro) => unitrate[unit] || msateuro)
  , unitf$   = O.combineLatest(unit$, msateuro$, unitFormatter)

  // Keep track of connection status
  , connected$ = req$$.flatMap(r$ => r$.mapTo(true).catch(_ => O.empty()))
      .merge(error$.filter(isConnError).mapTo(false))
      .startWith(false)
      .distinctUntilChanged()

  // Keep track of the number of user-initiated in-flight HTTP requests
  , inflight$ = req$$.filter(({ request: r }) => !(r.ctx && r.ctx.bg))
      .flatMap(r$ => r$.catch(_ => O.of(null)).mapTo(-1).startWith(+1))
      .startWith(0).scan((N, a) => N+a)

  // Show loading indicator if we have active in-flight foreground requests
  , loading$ = inflight$.map(inflight => inflight > 0)

  // Split up successful and unsuccessful payment attempts
  , [ paySent$, payFail$ ] = payResult$.partition(p => !p.err)

  // User-visible alert messages
  , alert$ = O.merge(
      error$.map(err  => [ 'danger', ''+err ])
    , incoming$.map(i => [ 'success', `Received payment of @{{${recvAmt(i)}}}` ])
    , paySent$.map(p  => [ 'success', `Sent payment of @{{${p.msatoshi}}}` ])
    , funded$.map(c   => [ 'success', `Opening channel for @{{${c.chan.total_msat}}}, awaiting on-chain confirmation` ])
    , closed$.map(c   => [ 'success', `Channel ${c.chan.short_channel_id || c.chan.channel_id} is closing` ])
    , dismiss$.mapTo(null)
    )
    // hide "connection lost" errors when we get back online
    .combineLatest(connected$, (alert, conn) => alert && (isConnError(alert[1]) && conn ? null : alert))
    // format msat amounts in messages
    .combineLatest(unitf$, (alert, unitf) => alert && [ alert[0], fmtAlert(alert[1], unitf) ])
    .startWith(null)

  // On-chain balance
  // TODO: patch with known outgoing payments
  , obalance$ = funds$.map(funds => sumOuts(funds.outputs))
      .distinctUntilChanged()

  // List of active channels
  // Periodically re-sync channel balance from "listpeers",
  // continuously patch with known channel opening/closing
  , channels$ = O.merge(
      peers$.map(peers => _ => getChannels(peers))
    , funded$.map(chan => S => [ ...S, chan ])
    , closed$.map(chan => S => [ ...S.filter(c => c.chan.channel_id != chan.chan.channel_id), chan ])
    ).startWith(null).scan((S, mod) => mod(S))
    .filter(Boolean)

  // Total channel balance
  // Periodically re-sync channel balance from "listpeers",
  // continuously patch with known incoming & outgoing payments
  , cbalance$ = O.merge(
      channels$.map(chans => _ => sumChans(chans))
    , incoming$.map(inv => N => N + inv.amount_received_msat)
    , paySent$.map(pay => N => N - pay.amount_sent_msat)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  // Periodically re-sync from listpays, continuously patch with known outgoing
  // payments and payment status update notifications
  , freshPays$ = O.merge(
      payments$.map(payments => _ => payments.map(parsePayment))
    , paySent$.map(pay => payments => payments && mergePayUpdates(payments, [ pay ]))
    , payFail$.map(fail => payments => payments && markFailed(payments, fail.pay.payment_hash))
    , payUpdates$.map(updates => payments => payments && mergePayUpdates(payments, updates))
    , confPay$.map(o => payments => payments && mergePayUpdates(payments, [ pendingPayStub(o) ]))
    )
    .startWith(null).scan((payments, mod) => mod(payments))
    .filter(Boolean)

  // Periodically re-sync from listinvoices (paid only),
  // continuously patch with known incoming payments
  , freshInvs$ = O.merge(
      invoices$.map(invs => _ => invs.filter(inv => inv.status == 'paid'))
    , incoming$.map(inv => invs => invs && [ ...invs, inv ])
    )
    .startWith(null).scan((invs, mod) => mod(invs))
    .filter(Boolean)
    .distinctUntilChanged((prev, next) => prev.length === next.length)

  // Chronologically sorted feed of incoming and outgoing payments
  , feed$ = O.combineLatest(freshInvs$, freshPays$, (invoices, payments) => [
      ...invoices.map(i => [ 'in',  i.paid_at,    recvAmt(i), i ])
    , ...payments.map(p => [ 'out', p.created_at, p.msatoshi, p ])
    ].sort((a, b) => b[1] - a[1]))

  // Collapsed payment/invoice on home feed list
  , feedActive$ = togFeed$.merge( // display feed items manually toggled by the user, and...
      incoming$.map(inv => `in-${inv.payment_hash}`) // auto display incoming payments
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
                     .merge(goRecv$.merge(offer$).merge(payreq$).mapTo(''))
    , unit:     unit$
    , step:     unit$.map(unit => unitstep[unit])
    })

  // Collapsed channel
  , chanActive$ = O.merge(
      togChan$ // display channel toggler by the user
    , funded$.map(f => f.chan.channel_id) // auto display newly funded channels
    , goChan$.filter(p => p.search != '?r').mapTo(null) // reset when opening channels page
  ).startWith(null).scan((S, chanid) => S == chanid ? null : chanid)

  // On-chain deposit
  , depositAddrType$ = togAddrType$
      .startWith('bech32')
      .scan(t => t == 'bech32' ? 'p2sh-segwit' : 'bech32')

  // Offers
  , offersEnabled$ = lnconfig$.map(checkOffersEnabled).startWith(null)
  , offerPayQuantity$ = offerPayQuantityInput$
      .merge(offer$.map(offer => offer.quantity_min))
      .startWith(null)

  // RPC console history
  , rpcHist$ = execRes$.startWith([]).merge(clrHist$.mapTo('clear'))
      .scan((xs, x) => x === 'clear' ? [] : [ x, ...xs ].slice(0, 20))

  dbg({ loading$, connected$, alert$, rpcHist$, freshPays$, freshInvs$, feed$, feedStart$, feedActive$ }, 'spark:model')
  dbg({ error$ }, 'spark:error')
  dbg({ savedConf$, conf$, expert$, theme$, unit$, conf$ }, 'spark:config')

  return combine({
    conf$, page$, loading$, alert$
  , unitf$, cbalance$, rate$
  , funds$: funds$.startWith(null), obalance$: obalance$.startWith(null)
  , info$: info$.startWith(null), peers$: peers$.startWith(null), channels$: channels$.startWith(null)
  , feed$: feed$.startWith(null), feedStart$, feedActive$
  , amtData$, chanActive$, rpcHist$
  , fundMaxChan$, depositAddrType$
  , offersEnabled$, offerPayQuantity$, invUseOffer$
  , msateuro$, btceuro$: btceuro$.startWith(null)
  }).shareReplay(1)
}

function mergePayUpdates(payments, updates) {
  const updated = new Set(updates.map(p => p.payment_hash))
  return [ ...payments.filter(p => !updated.has(p.payment_hash))
         , ...updates.map(parsePayment) ]
}

const markFailed = (payments, payment_hash) => payments.map(pay =>
  pay.payment_hash == payment_hash ? { ...pay, status: 'failed' } : pay)

// Create a stub entry for a newly sent pending payment that doesn't yet have a `listpays` entry
// Will be replaced with the real entry as soon as its received.
const pendingPayStub = inv => ({
  status: 'pending'
, created_at: Date.now()/1000|0
, msatoshi: inv.custom_msat || inv.msatoshi
, amount_sent_msat: 0
, destination: inv.payee || inv.node_id || inv.destination
, ...only(inv, 'payment_hash', 'description', 'offer_id', 'vendor', 'quantity', 'payer_note' )
})

const unitFormatter = (unit, msateuro) => (msat, as_alt_unit=false, non_breaking=true) => {
  const unit_d = !as_alt_unit ? unit : (unit == 'euro' ? 'sat' : 'euro')
  const unit_rate = unit_d == 'euro' ? msateuro : unitrate[unit_d]

  // Use less precision for euro when displayed as the alt unit
  const unit_prec = unit_d == 'euro' && as_alt_unit ? 2 : unitprec[unit_d]

  // If the alt unit's rate is missing, hide it entirely. The primary one
  // is returned as 'n/a' (below).
  if (as_alt_unit && !unit_rate) return null

  const separator = non_breaking ? '\xa0' : ' '
  return `${unit_rate ? formatAmt(msat, unit_rate, unit_prec) : 'n/a'}${separator}${unit_d}`
}

// Check if experimental offers support is enabled
// Always considered off in c-lightning <=v0.10.0 because it used an incompatible spec.
const checkOffersEnabled = conf =>
  !!(conf['experimental-offers'] && !/^0\.(9\.|10\.0)/.test(conf['# version']))
