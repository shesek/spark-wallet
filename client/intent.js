import { Observable as O } from 'rxjs'
import serialize from 'form-serialize'
import { dbg } from './util'

module.exports = ({ DOM, HTTP, SSE, route, scan$ }) => {
  const
    on     = (sel, ev) => DOM.select(sel).events(ev)
  , click  = sel => on(sel, 'click').map(e => e.target.dataset)
  , submit = sel => on(sel, 'submit').map(e => serialize(e.target, { hash: true }))

  , goHome$  = route('/')
  , goScan$  = route('/scan')
  , goRecv$  = route('/recv')
  , goLogs$  = route('/logs')
  , goRpc$   = route('/rpc')

  , scanPay$ = scan$.filter(x => x.substr(0, 10).toLowerCase() === 'lightning:').map(x => x.substr(10))
  , confPay$ = click('[data-do=confirm-pay]')

  , newInv$  = submit('[data-do=newinv]').map(r =>
      ({ ...r, msatoshi: r.satoshi ? r.satoshi*1000 : 'any', description: r.description || 'Lightning' }))

  , dismiss$ = click('[data-dismiss=alert]')

  //, fetchInv$  = route('/inv/:label').map(l => l.params[1])

  , click$ = click(':root')
  , togExpert$ = click$.buffer(click$.debounceTime(250)).filter(xs => xs.length === 3)

  on('form', 'submit').subscribe(e => e.preventDefault())

  dbg({click$, togExpert$})

  return { goHome$, goScan$, goRecv$, goLogs$, goRpc$
         , scanPay$, confPay$, newInv$, dismiss$, togExpert$ }
}

