import { Observable as O } from 'rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
import fscreen from 'fscreen'
import { dbg } from './util'

module.exports = ({ DOM, route, scan$, conf$ }) => {
  const
    on     = (sel, ev) => DOM.select(sel).events(ev)
  , click  = sel => on(sel, 'click').map(e => e.target.dataset)
  , dclick = sel => on(sel, 'dblclick').map(e => e.target.dataset)
  , submit = sel => on(sel, 'submit').map(e => serialize(e.target, { hash: true }))

  , goHome$ = route('/')
  , goScan$ = route('/scan')
  , goSend$ = route('/payreq')
  , goRecv$ = route('/recv')
  , goLogs$ = route('/logs').merge(click('[do=refresh-logs]'))
  , goRpc$  = route('/rpc')

  , scanPay$ = scan$.map(x => x.toLowerCase()).filter(x => x.substr(0, 10) === 'lightning:').map(x => x.substr(10))
  , viewPay$ = O.merge(scanPay$, submit('[do=decode-pay]').map(r => r.bolt11))
  , confPay$ = click('[do=confirm-pay]')

  , clrHist$ = click('[do=clear-console-history]')
  , execRpc$ = submit('[do=exec-rpc]').map(r => stringArgv(r.cmd))
      .merge(click('[do=rpc-help]').mapTo([ 'help' ]))

  , recvAmt$ = on('[name=amount]', 'input').map(e => e.target.value)
  , newInv$  = submit('[do=new-invoice]').map(r => ({
      label:       nanoid()
    , msatoshi:    r.msatoshi || 'any'
    , description: r.description || 'Lightning' }))

  , togTheme$ = O.merge(click('.toggle-theme').mapTo(+1), dclick('.theme').mapTo(-1))
  , togUnit$  = O.merge(click('.toggle-unit').mapTo(+1), dclick('.toggle-unit').mapTo(-1))
  , togCam$   = click('.toggle-cam')
  , togFull$  = dclick('.full-screen')
  , togExp$   = dclick('.toggle-exp')

  , dismiss$  = O.merge(route('*'), submit('form'), click('[data-dismiss], .content a, .content button'))

  on('form', 'submit').subscribe(e => e.preventDefault())

  // @xxx this should not be here
  togFull$.subscribe(_ => fscreen.fullscreenElement ? fscreen.exitFullscreen() : fscreen.requestFullscreen(document.documentElement))

  return { goHome$, goScan$, goSend$, goRecv$, goLogs$, goRpc$
         , viewPay$, confPay$, execRpc$, clrHist$, newInv$, recvAmt$
         , dismiss$, togExp$, togTheme$, togUnit$, togCam$
         , scanner$: DOM.select('.scanqr').elements()
         , conf$ }
}
