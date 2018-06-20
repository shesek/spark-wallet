import { Observable as O } from './rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
import fscreen from 'fscreen'
import { dbg, parseUri } from './util'

module.exports = ({ DOM, route, conf$, scan$, urihandler$ }) => {
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

  // manifest.json-enabled URI handling, similar to cordova's urihandler$
  , weburi$ = route('/webappuri').map(p => p.search.substr(1))

  // Start/stop QR scanner
  , scanner$ = O.merge(scan$, page$.filter(p => p.pathname != '/scan')).mapTo(false)
                .merge(goScan$.mapTo(true))

  // Display and confirm payment requests (from QR, lightning: URIs and manual entry)
  , viewPay$ = O.merge(scan$, urihandler$, weburi$).map(parseUri).filter(x => !!x)
                .merge(submit('[do=decode-pay]').map(r => r.bolt11))
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
    , description: r.description || '⚡' }))

  // Config page and toggle buttons
  , saveConf$ = submit('[do=save-config]')
  , togTheme$ = O.merge(click('.toggle-theme').mapTo(+1))
  , togUnit$  = O.merge(click('.toggle-unit').mapTo(+1))
  , togFull$  = dclick('.full-screen')
  , togExp$   = dclick('.toggle-exp')

  // Dismiss alert message
  , dismiss$  = O.merge(submit('form'), click('[data-dismiss=alert], .content a, .content button')
                      , page$.filter(p => p.pathname != '/'))

  // Feed event page navigation
  , feedStart$ = click('[data-feed-start]').map(d => +d.feedStart).merge(goHome$.mapTo(0)).startWith(0)

  // @xxx side effects outside of drivers!
  on('form', 'submit').subscribe(e => e.preventDefault())
  togFull$.subscribe(_ => fscreen.fullscreenElement ? fscreen.exitFullscreen() : fscreen.requestFullscreen(document.documentElement))

  return { conf$, page$, scanner$
         , goHome$, goScan$, goSend$, goRecv$, goLogs$, goRpc$, goConf$
         , viewPay$, confPay$
         , execRpc$, clrHist$
         , newInv$, recvAmt$
         , saveConf$, togExp$, togTheme$, togUnit$
         , feedStart$
         , dismiss$
         }
}
