import { Observable as O } from './rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
import fscreen from 'fscreen'
import { dbg, parseUri } from './util'

module.exports = ({ DOM, route, conf$, scan$, urihandler$ }) => {
  const
    on     = (sel, ev, pd=false) => DOM.select(sel).events(ev, { preventDefault: pd })
  , click  = sel => on(sel, 'click').map(e => e.ownerTarget.dataset)
  , submit = sel => on(sel, 'submit', true).map(e => ({ ...e.target.dataset, ...serialize(e.target, { hash: true }) }))

  // Page routes
  , page$   = route()
  , goHome$ = route('/')
  , goScan$ = route('/scan')
  , goSend$ = route('/payreq')
  , goRecv$ = route('/recv')
  , goNode$ = route('/node')
  , goLogs$ = route('/logs').merge(click('[do=refresh-logs]'))
  , goRpc$  = route('/rpc')

  // Display and confirm payment requests (from QR, lightning: URIs and manual entry)
  , viewPay$ = O.merge(scan$, urihandler$).map(parseUri).filter(x => !!x)
                .merge(submit('[do=decode-pay]').map(r => r.bolt11.trim()))
  , confPay$ = submit('[do=confirm-pay]')

  // RPC console actions
  , clrHist$ = click('[do=clear-console-history]')
  , execRpc$ = submit('[do=exec-rpc]').map(r => stringArgv(r.cmd))
      .merge(click('[do=rpc-help]').mapTo([ 'help' ]))

  // New invoice actions
  , newInv$  = submit('[do=new-invoice]').map(r => ({
      label:       nanoid()
    , msatoshi:    r.msatoshi || 'any'
    , description: r.description || '⚡' }))

  // Payment amount field, shared for creating new invoices and for paying custom amounts
  , amtVal$ = on('[name=amount]', 'input').map(e => e.target.value)

  // Config page and toggle buttons
  , togTheme$ = click('.toggle-theme')
  , togUnit$  = click('.toggle-unit')
  , togExp$   = click('.toggle-exp')

  // Dismiss alert message
  , dismiss$  = O.merge(submit('form'), click('[data-dismiss=alert], a.navbar-brand, .content a, .content button')
                      , page$.filter(p => p.pathname != '/'))

  // Feed event page navigation and click-to-collapse
  , feedStart$ = click('[data-feed-start]').map(d => +d.feedStart).merge(goHome$.mapTo(0)).startWith(0)
  , feedShow$  = click('[data-feed-id]').map(d => d.feedId).startWith(null).scan((S, fid) => S == fid ? null : fid)
      .merge(togExp$.mapTo(null))

  return { conf$, page$
         , goHome$, goScan$, goSend$, goRecv$, goNode$, goLogs$, goRpc$
         , viewPay$, confPay$
         , execRpc$, clrHist$
         , newInv$, amtVal$
         , togExp$, togTheme$, togUnit$
         , feedStart$, feedShow$
         , dismiss$
         }
}
