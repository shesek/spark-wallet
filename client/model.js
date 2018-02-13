import big from 'big.js'
import { Observable as O } from 'rxjs'
import { dbg, formatAmt, combine, extractErrors, dropErrors } from './util'

const
  sumOuts  = outs  => outs.reduce((T, o) => T + o.value, 0)
, sumChans = chans => chans.reduce((T, c) => T + c.channel_sat, 0) * 1000
, updPaid  = (invs, paid) => invs.map(i => i.label === paid.label ? { ...i, ...paid  } : i)

, buildRes = r => r.request.state ? { ...r.body, ...r.request.state } : r.body

, add = x => xs => [ ...xs, x ]
, rem = x => xs => xs.filter(_x => _x !== x)
, idx = xs => x => xs.indexOf(x)
, idn = x => x

const themes   = 'cerulean cosmo cyborg darkly flatly journal litera lumen lux materia minty pulse sandstone simplex sketchy slate solar spacelab superhero united yeti'.split(' ')
    , units    = [ 'sat', 'bits', 'milli', 'btc', 'usd' ]
    , unitrate = { sat: 0.001, bits: 0.00001, milli: 0.00000001, btc: 0.00000000001 }
    , unitstep = { ...unitrate, usd: 0.0000001 }

module.exports = ({ HTTP, SSE, dismiss$, togExp$, togTheme$, togUnit$, newInvAmt$, savedConf$ }) => {
  const
    conf  = (name, def, list) => savedConf$.first().map(c => c[name] || def).map(list ? idx(list) : idn)
  , reply = category => dropErrors(HTTP.select(category)).map(buildRes)

  // Events

  , payreq$   = reply('decodepay')
  , invoice$  = reply('invoice').map(inv => ({ ...inv, status: 'unpaid' }))
  , logs$     = reply('getlog').map(r => r.log)
  , outgoing$ = reply('pay')
  , incoming$ = SSE('waitany')

  , currPaid$ = incoming$.withLatestFrom(invoice$).filter(([ pay, inv ]) => pay.label === inv.label)
  , goto$     = O.merge(currPaid$, outgoing$).mapTo('/')

  // State

  , error$    = extractErrors(HTTP.select())
  , peers$    = reply('listpeers').map(r => r.peers).startWith(null)
  , funds$    = reply('listfunds')
  , info$     = reply('getinfo')

  // periodically re-sync from listpayments, continuously patch with known outgoing payments
  , payments$ = O.merge(
      reply('listpayments').map(r => _ => r.payments)
    , outgoing$.map(pay => payments => [ ...payments, { ...pay, status: 'complete', created_at: Date.now()/1000|0 } ])
    ).startWith([]).scan((payments, mod) => mod(payments))

  // periodically re-sync from listinvoices, continuously patch with known invoices (paid only)
  , invoices$ = O.merge(
      reply('listinvoices').map(r => _ => r.invoices)
    , invoice$.map(inv  => invs => [ ...invs, inv ])
    , incoming$.map(inv => invs => updPaid(invs, inv))
    )
    .startWith([]).scan((invs, mod) => mod(invs))
    .map(invs => invs.filter(inv => inv.status === 'paid'))

  // periodically re-sync channel balance from "listfunds", continuously patch with known incoming & outgoing payments
  , cbalance$ = O.merge(
      funds$.map(funds  => _ => sumChans(funds.channels))
    , incoming$.map(inv => N => N + inv.msatoshi_received)
    , outgoing$.map(pay => N => N - pay.msatoshi)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  // on-chain output balance (not currently used for anything, but seems useful?)
  , obalance$ = funds$.map(funds => sumOuts(funds.outputs))

  // chronologically sorted feed of incoming and outgoing payments
  , moves$    = O.combineLatest(invoices$, payments$, (invoices, payments) => [
      ...invoices.map(inv => [ 'in',  inv.paid_at,    inv.msatoshi_received, inv ])
    , ...payments.map(pay => [ 'out', pay.created_at, pay.msatoshi,          pay ])
    ].sort((a, b) => b[1] - a[1]))

  // config options
  , expert$  = conf('expert', false)        .concat(togExp$)  .scan(x => !x)
  , theme$   = conf('theme', 'yeti', themes).concat(togTheme$).scan(n => (n+1) % themes.length).map(n => themes[n])
  , unit$    = conf('unit',  'sat',  units) .concat(togUnit$) .scan(n => (n+1) % units.length) .map(n => units[n])
  , conf$    = combine({ expert$, theme$, unit$ })

  // currency & unit conversion handling
  , msatusd$ = SSE('btcusd').map(rate => big(rate).div(100000000000)).startWith(null)
  , rate$    = O.combineLatest(unit$, msatusd$, (unit, msatusd) => unit == 'usd' ? msatusd : unitrate[unit])
  , unitf$   = O.combineLatest(unit$, rate$, (unit, rate) => msat => `${rate ? formatAmt(msat, rate, unitstep[unit]) : '⌛'} ${unit}`)

  // dynamic currency conversion for payment request form
  , recvMsat$ = newInvAmt$.withLatestFrom(rate$, (amt, rate) => console.log('flash:rate recvMsat', { amt, rate}) || amt && rate && big(amt).div(rate).round(0).toString() || '').startWith(null)
  , recvForm$ = combine({
      msatoshi: recvMsat$
    , amount:   rate$.withLatestFrom(recvMsat$, unit$, (rate, msat, unit) => console.log('flash:rate recvForm amount',{msat,rate,res:msat*rate}) || msat && rate && formatAmt(msat, rate, unitstep[unit]).replace(/,/g, '') || '')
    , step:     unit$.map(unit => unitstep[unit])
    })

  // keep track of in-flight requests
  , loading$ = HTTP.select().flatMap(r$ =>
      O.of(add(r$.request)).merge(r$.catch(_ => O.of(null)).mapTo(rem(r$.request)))
    ).startWith([]).scan((xs, mod) => mod(xs))

  // user-visible alerts
  , alert$   = O.merge(
      error$.map(err  => [ 'danger', err ])
    , incoming$.withLatestFrom(unitf$, (i, unitf) => [ 'success', `Received ${ unitf(i.msatoshi_received) }` ])
    , outgoing$.withLatestFrom(unitf$, (i, unitf) => [ 'success', `Sent ${ unitf(i.msatoshi) }` ])
    , dismiss$.mapTo(null)
    ).startWith(null)

  , state$   = combine({ conf$, info$, alert$, loading$, moves$, peers$, cbalance$, obalance$, unitf$, recvForm$ }).shareReplay(1)

  dbg({ reply$: HTTP.select().flatMap(r$ => r$.catch(_ => O.empty())).map(r => [ r.request.category, r.body, r.request ]) }, 'flash:reply')
  dbg({ payreq$, invoice$, outgoing$, incoming$, state$, goto$, loading$, alert$ }, 'flash:model')
  dbg({ error$ }, 'flash:error')
  dbg({ unit$, rate$, newInvAmt$, recvMsat$, recvForm$, msatusd$ }, 'flash:rate')

  dbg({ savedConf$, conf$, expert$, theme$, unit$, conf$ }, 'flash:config')

  return { payreq$, invoice$, outgoing$, incoming$, logs$
         , state$, goto$, alert$ }
}
