import { Observable as O } from 'rxjs'
import { dbg, formatBTC, formatUSD, combine, extractErrors } from './util'

const
  sumOuts  = outs  => outs.reduce((T, o) => T + o.value, 0)
, sumChans = chans => chans.reduce((T, c) => T + c.channel_sat, 0) * 1000
, updatePaid = (invs, paid) => invs.map(i => i.label === paid.label ? { ...i, ...paid  } : i)

, add = x => xs => [ ...xs, x ]
, rem = x => xs => xs.filter(_x => _x !== x)

const themes = 'yeti cerulean cosmo cyborg darkly flatly journal litera lumen lux materia minty pulse sandstone simplex sketchy slate solar spacelab superhero united'.split(' ')
    , units  = [ 'sat', 'bits', 'milli', 'btc', 'usd' ]

module.exports = ({ HTTP, SSE, dismiss$, togExp$, togTheme$, togUnit$ }) => {
  const
    reply = category => HTTP.select(category).flatMap(r$ => r$.catch(_ => O.empty()))
      .map(r => r.request.state ? { ...r.body, ...r.request.state } : r.body)

  //
  // Events
  //

  , error$    = extractErrors(HTTP.select())

  , payreq$   = reply('decodepay')
  , invoice$  = reply('invoice').map(inv => ({ ...inv, status: 'unpaid' }))
  , logs$     = reply('getlog').map(r => r.log)
  , outgoing$ = reply('pay')
  , incoming$ = SSE('waitany')

  , currPaid$ = incoming$.withLatestFrom(invoice$).filter(([ pay, inv ]) => pay.label === inv.label)
  , goto$     = O.merge(currPaid$, outgoing$).mapTo('/')

  //
  // State
  //

  , peers$    = reply('listpeers').map(r => r.peers).startWith(null)
  , funds$    = reply('listfunds')
  , info$     = reply('getinfo')

  , payments$ = O.merge(
      reply('listpayments').map(r => _ => r.payments)
    , outgoing$.map(pay => payments => [ ...payments, { ...pay, status: 'complete', created_at: Date.now()/1000|0 } ])
    ).startWith([]).scan((payments, mod) => mod(payments))

  , invoices$ = O.merge(
      reply('listinvoices').map(r => _ => r.invoices)
    , invoice$.map(inv  => invs => [ ...invs, inv ])
    , incoming$.map(inv => invs => updatePaid(invs, inv))
    ).startWith([]).scan((invs, mod) => mod(invs))

  , moves$    = O.combineLatest(payments$, invoices$, (payments, invoices) => [
      ...payments.map(pay => ({ pay, type: 'out', ts: pay.created_at, msatoshi: pay.msatoshi }))
    , ...invoices.filter(inv => inv.status === 'paid').map(inv => ({ inv, type: 'in', ts: inv.paid_at, msatoshi: inv.msatoshi_received }))
    ].sort((a, b) => b.ts - a.ts))

  , obalance$ = funds$.map(funds => sumOuts(funds.outputs))

  , cbalance$ = O.merge(
      funds$.map(funds  => _ => sumChans(funds.channels))
    , incoming$.map(inv => N => N + inv.msatoshi_received)
    , outgoing$.map(pay => N => N - pay.msatoshi)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  , config$  = combine({
      expert: togExp$.startWith(false).scan(x => !x)
    , theme:  togTheme$.startWith(0).scan(n => (n+1) % themes.length).map(n => themes[n])
    , unit:   togUnit$ .startWith(0).scan(n => (n+1) % units.length) .map(n => units[n])
    })

  , expert$  = togExp$.startWith(false).scan(x => !x)

  , theme$   = togTheme$.startWith(0).scan(n => (n+1) % themes.length).map(n => themes[n])
  , unit$    = togUnit$.startWith(0).scan(n => (n+1) % units.length).map(n => units[n])

  , rate$    = SSE('rate').startWith(null)
  , unitf$   = O.combineLatest(unit$, rate$, (unit, rate) => msat =>
      `${unit == 'usd' ? (rate ? formatUSD(msat, rate) : '⌛')
                       : formatBTC(msat, unit)} ${unit}`)

  , loading$ = HTTP.select().flatMap(r$ =>
      O.of(add(r$.request)).merge(r$.catch(_ => O.of(null)).mapTo(rem(r$.request)))
    ).startWith([]).scan((xs, mod) => mod(xs))

  , alert$   = O.merge(
      error$.map(err  => [ 'danger', err ])
    , incoming$.withLatestFrom(unitf$, (i, unitf) => [ 'success', `Received ${ unitf(i.msatoshi_received) }` ])
    , outgoing$.withLatestFrom(unitf$, (i, unitf) => [ 'success', `Sent ${ unitf(i.msatoshi) }` ])
    , dismiss$.mapTo(null)
    ).startWith(null)

  , state$   = combine({ info$, expert$, alert$, loading$, moves$, peers$, cbalance$, obalance$, theme$, unit$, unitf$, rate$ }).shareReplay(1)

  dbg({ reply$: HTTP.select().flatMap(r$ => r$.catch(_ => O.empty())).map(r => [ r.request.category, r.body, r.request ]) }, 'flash:reply')
  dbg({ payreq$, invoice$, outgoing$, incoming$, state$, goto$, loading$, alert$ }, 'flash:model')
  dbg({ error$ }, 'flash:error')
  dbg({ rate$ }, 'flash:rate')

  return { payreq$, invoice$, outgoing$, incoming$, logs$
         , state$, goto$, alert$ }
}
