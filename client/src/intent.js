import { Observable as O } from './rxjs'
import serialize from 'form-serialize'
import stringArgv from 'string-argv'
import nanoid from 'nanoid'
import { dbg, parseUri } from './util'

module.exports = ({ DOM, route, conf$, scan$, urihandler$ }) => {
  const
    on     = (sel, ev, pd=false) => DOM.select(sel).events(ev, { preventDefault: pd })
  , click  = sel => on(sel, 'click')
  , submit = sel => on(sel, 'submit', true).map(e => ({ ...e.target.dataset, ...serialize(e.target, { hash: true }) }))

  // Page routes
  , page$   = route()
  , goHome$ = route('/')
  , goScan$ = route('/scan')
  , goSend$ = route('/payreq')
  , goRecv$ = route('/recv')
  , goNode$ = route('/node')
  , goChan$ = route('/channels')
  , goLogs$ = route('/logs').merge(click('[do=refresh-logs]'))
  , goRpc$  = route('/rpc')

  // Display and confirm payment requests (from QR, lightning: URIs and manual entry)
  , viewPay$ = O.merge(scan$, urihandler$).map(parseUri).filter(x => !!x)
                .merge(submit('[do=decode-pay]').map(r => r.bolt11.trim()).map(bolt11 => parseUri(bolt11) || bolt11))
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
  , dismiss$ = O.merge(submit('form'), click('[data-dismiss=alert], a.navbar-brand, .content a, .content button')
                     , page$.filter(p => p.search != '?r'))

  // Payments feed page navigation and click-to-toggle
  , feedStart$ = click('[data-feed-start]').map(e => +e.ownerTarget.dataset.feedStart).startWith(0)
  , togFeed$ = click('ul.feed [data-feed-toggle]')
      .filter(e => e.target.closest('ul').classList.contains('feed')) // ignore clicks inside nested <ul>s
      .map(e => e.ownerTarget.dataset.feedToggle)

  // Channels management
  , updChan$ = click('[do=refresh-channels]')
  , togChan$ = click('ul.channels [data-chan-toggle]')
      .filter(e => e.target.closest('ul').classList.contains('channels')) // ignore clicks inside nested <ul>s
      .map(e => e.ownerTarget.dataset.chanToggle)

  return { conf$, page$
         , goHome$, goScan$, goSend$, goRecv$, goNode$, goChan$, goLogs$, goRpc$
         , viewPay$, confPay$
         , execRpc$, clrHist$
         , newInv$, amtVal$
         , togExp$, togTheme$, togUnit$
         , feedStart$, togFeed$
         , togChan$, updChan$
         , dismiss$
         }
}
