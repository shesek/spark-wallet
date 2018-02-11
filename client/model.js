import { Observable as O } from 'rxjs'
import { dbg, combine, extractErrors } from './util'

const
  sumOuts  = outs  => outs.reduce((T, o) => T + o.value, 0)
, sumChans = peers => peers.reduce((T, p) => T + (p.channels||[]).reduce((C, c) => C + (c.msatoshi_to_us || 0), 0), 0)
, updatePaid = (invs, paid) => invs.map(i => i.label === paid.label ? { ...i, ...paid  } : i)

module.exports = ({ HTTP, SSE, dismiss$, togExpert$ }) => {
  const
    reply    = category => HTTP.select(category).flatMap(r$ => r$.catch(_ => O.empty())).map(r => ({ ...r, state: r.request.state, params: r.request.send.params }))

  , payreq$   = reply('decodepay').map(r => ({ ...r.body, ...r.state }))
  , invoice$  = reply('invoice').map(({ body, state, params }) => console.log({body,state,params}) || ({ ...body, ...state, label: params[1], status: 'unpaid' }))
  , outgoing$ = reply('pay').map(({ body, state }) => ({ ...body, ...state }))
  , incoming$ = SSE('waitany').map(r => r.data).map(JSON.parse)
      .withLatestFrom(invoice$.startWith({}), (pay, inv) =>
        ({ ...pay, active: pay.label === inv.label }))

  , peers$    = reply('listpeers').map(r => r.body.peers)
  , outputs$  = reply('listfunds').map(r => r.body.outputs)
  , payments$ = reply('listpayments').map(r => r.body.payments)

  , invoices$ = O.merge(
      reply('listinvoices').map(r => _ => r.body.invoices)
    , invoice$.map(inv  => invs => [ ...invs, inv ])
    , incoming$.map(inv => invs => updatePaid(invs, inv))
    ).startWith([]).scan((invs, mod) => mod(invs))

  , history$ = O.combineLatest(payments$, invoices$, (payments, invoices) => [
      ...payments.map(p => ({ ...p, type: 'out', ts: p.created_at }))
    , ...invoices.filter(inv => inv.status === 'paid').map(inv => ({ ...inv, type: 'in', ts: inv.paid_at }))
    ].sort((a, b) => b.ts - a.ts))

  , obalance$ = outputs$.map(sumOuts)

  , cbalance$ = O.merge(
      peers$.map(peers  => _ => sumChans(peers))
    , incoming$.map(inv => N => N + inv.msatoshi_received)
    , outgoing$.map(pay => N => N - pay.msatoshi)
    ).startWith(null).scan((N, mod) => mod(N)).distinctUntilChanged()

  , expert$ = togExpert$.startWith(false).scan(x => !x)
  , logs$   = reply('getlog').map(r => r.log)

  , goto$  = O.merge(
      incoming$.filter(inv => inv.active).mapTo('/')
    , outgoing$.mapTo('/')
    )

  , state$ = combine({ history$, peers$, cbalance$, obalance$, expert$ }).shareReplay(1)
  , error$ = extractErrors(HTTP.select())

  , alert$ = O.merge(
      error$.map(error => [ 'danger', error ])
    , incoming$.mapTo([ 'success', 'Payment received' ])
    , outgoing$.mapTo([ 'success', 'Payment sent' ])
    , dismiss$.mapTo(null)
    )

  , loading$ = O.merge(
      HTTP.select().mapTo(N => N+1)
    , HTTP.select().flatMap(r$ => r$.catch(_ => null)).mapTo(N => N-1)
    ).startWith(0).scan((N, mod) => mod(N))

  dbg({ reply$: reply().map(r => [ r.request.category, r.body, r.request ]) }, 'flash:reply')
  dbg({ payreq$, invoice$, outgoing$, incoming$, state$, goto$, loading$, alert$ }, 'flash:model')
  dbg({ error$ }, 'flash:error')

  return { payreq$, invoice$, outgoing$, incoming$, logs$
         , state$, goto$, loading$, error$, alert$ }
}

