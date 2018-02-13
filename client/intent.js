import { Observable as O } from 'rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
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
  //, fetchInv$  = route('/inv/:label').map(l => l.params[1])

  , scanPay$ = scan$.map(x => x.toLowerCase()).filter(x => x.substr(0, 10) === 'lightning:').map(x => x.substr(10))
  , confPay$ = click('[do=confirm-pay]')
  , execRpc$ = submit('[do=exec-rpc]').map(r => stringArgv(r.cmd))

  , newInv$  = submit('[data-do=newinv]').map(r => ({
      label:       nanoid()
    , msatoshi:    r.msatoshi || 'any'
    , description: r.description || 'Lightning' }))

  , newInvAmt$ = on('[name=amount]', 'input').map(e => e.target.value)


  , dismiss$ = click('[data-dismiss=alert], a, button').merge(submit('form'))

  , togExp$  = nthClick(click('document'), 3)
  //, togExp$  = on('.info', 'dblclick')

  , togTheme$ = click('.theme')
  , togUnit$  = click('.toggle-unit')

  on('form', 'submit').subscribe(e => e.preventDefault())

  return { goHome$, goScan$, goRecv$, goLogs$, goRpc$
         , scanPay$, confPay$, execRpc$, newInv$, newInvAmt$
         , dismiss$, togExp$, togTheme$, togUnit$ }
}

const parseCmd = str => str.split(' ')

const nthClick = (click$, nth) =>
  O.merge(click$.mapTo(N => N+1), click$.debounceTime(250).mapTo(N => 0))
    .startWith(0).scan((N, mod) => mod(N))
    .filter(N => N == nth)
