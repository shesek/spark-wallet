import { Observable as O } from './rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
import fscreen from 'fscreen'
import { dbg } from './util'

module.exports = ({ DOM, route, scan$, conf$ }) => {
  const
    on     = (sel, ev) => DOM.select(sel).events(ev)
  , click  = sel => on(sel, 'click').map(e => e.target.dataset)
  , dclick = sel => on(sel, 'dblclick').map(e => e.target.dataset) // @xxx doesn't seem to work on iOS, do manual dblclick detection?
  , submit = sel => on(sel, 'submit').map(e => serialize(e.target, { hash: true }))

  // Page routes
  , page$   = route()
  , goHome$ = route('/')
  , goScan$ = route('/scan')
  , goSend$ = route('/payreq')
  , goRecv$ = route('/recv')
  , goLogs$ = route('/logs').merge(click('[do=refresh-logs]'))
  , goRpc$  = route('/rpc')
  , goConf$ = route('/settings')

  // Scan, decode and confirm payments
  , scanPay$ = scan$.map(x => x.toLowerCase()).filter(x => x.substr(0, 10) === 'lightning:').map(x => x.substr(10))
  , viewPay$ = O.merge(scanPay$, submit('[do=decode-pay]').map(r => r.bolt11))
  , confPay$ = click('[do=confirm-pay]')

  // RPC console actions
  , clrHist$ = click('[do=clear-console-history]')
  , execRpc$ = submit('[do=exec-rpc]').map(r => stringArgv(r.cmd))
      .merge(click('[do=rpc-help]').mapTo([ 'help' ]))

  // New invoice actions
  , recvAmt$ = on('[name=amount]', 'input').map(e => e.target.value)
  , newInv$  = submit('[do=new-invoice]').map(r => ({
      label:       nanoid()
    , msatoshi:    r.msatoshi || 'any'
    , description: r.description || 'Lightning Payment' }))

  // Config page and toggle buttons
  , saveConf$ = submit('[do=save-config]')
  , togTheme$ = O.merge(click('.toggle-theme').mapTo(+1))
  , togUnit$  = O.merge(click('.toggle-unit').mapTo(+1))
  , togCam$   = click('.toggle-cam')
  , togFull$  = dclick('.full-screen')
  , togExp$   = dclick('.toggle-exp')

  // Dismiss alert message
  , dismiss$  = O.merge(submit('form'), click('[data-dismiss=alert], .content a, .content button'))

  // Feed event page navigation
  , feedStart$ = click('[data-feed-start]').map(d => +d.feedStart).merge(goHome$.mapTo(0)).startWith(0)

  // @xxx side effects outside of drivers!
  on('form', 'submit').subscribe(e => e.preventDefault())
  togFull$.subscribe(_ => fscreen.fullscreenElement ? fscreen.exitFullscreen() : fscreen.requestFullscreen(document.documentElement))

  return { conf$, page$
         , goHome$, goScan$, goSend$, goRecv$, goLogs$, goRpc$, goConf$
         , viewPay$, confPay$
         , execRpc$, clrHist$
         , newInv$, recvAmt$
         , saveConf$, togExp$, togTheme$, togUnit$, togCam$
         , feedStart$
         , dismiss$
         , scanner$: DOM.select('.scanqr').elements()
         }
}
