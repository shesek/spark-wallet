import { Observable as O } from './rxjs'
import { combine, toObs, recvAmt } from './util'
import views from './views'
import themeColors from '../theme-colors.json'

const isFunc = x => typeof x == 'function'

// DOM view
exports.vdom = ({ state$, goHome$, goScan$, goSend$, goRecv$, goChan$, goNewChan$, goNode$, goRpc$, payreq$, offer$, invoice$, newaddr$, logs$ }) => {
  const body$ = O.merge(
    // user actions
    goHome$.startWith(1).mapTo(views.home)
  , goScan$.mapTo(views.scanReq)
  , goSend$.mapTo(views.pasteReq)
  , goRecv$.mapTo(views.recv)
  , goChan$.mapTo(views.channels)
  , goNewChan$.mapTo(views.newChannel)
  , goNode$.mapTo(views.nodeInfo)
  , goRpc$.mapTo(views.rpc)

  // server responses
  , payreq$.map(views.confirmPay)
  , offer$.map(views.offer)
  , invoice$.flatMap(views.invoice)
  , newaddr$.flatMap(views.deposit)
  , logs$.map(views.logs)

  ).switchMap(view => isFunc(view) ? state$.map(view).flatMap(toObs) : O.of(view))


  // managed outside of cycle.js's vdom due to odd cache invalidation
  // behaviour exhibited by chrome that was causing slower pageloads
  // @xxx side effects outside of drivers!
  const themeLink = document.querySelector('link[href*=bootstrap]')
      , metaColor = document.querySelector('meta[name=theme-color]')

  state$.map(S => S.conf.theme).distinctUntilChanged().subscribe(theme => {
    const path = `swatch/${theme}/bootstrap.min.css`
    themeLink.getAttribute('href') != path && (themeLink.href = path)
    metaColor.content = themeColors[theme]
  })

  return combine({ state$, body$ }).map(views.layout)
}

// Navigation
exports.navto = ({ incoming$: in$, outgoing$: out$, invoice$: inv$, sinvoice$, payreq$, funded$ }) => O.merge(
  // navto '/' when receiving payments for the active invoice
  inPayActive(in$, inv$).mapTo({ pathname: '/', search: '?r' })
  // navto '/' after an incoming payment following a send_invoice offer
, sinvoice$.mapTo             ({ pathname: '/', search: '?r' })
  // navto '/' after sending payments
, out$.mapTo                  ({ pathname: '/', search: '?r' })
  // navto '/confirm' when viewing a payment request
, payreq$.mapTo               ({ pathname: '/confirm' })
  // navto /channels after opening channel
, funded$.mapTo               ({ pathname: '/channels', search: '?r' })
)

// returns a stream of incoming payments received to the latest invoice created by the user
const inPayActive = (in$, inv$) => in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label)

// HTML5 notifications
exports.notif = ({ incoming$, state$ }) =>
  incoming$.withLatestFrom(state$, (inv, { unitf }) => `Received payment of ${ unitf(recvAmt(inv)) }`)

// Start/stop QR scanner
exports.scanner = ({ goScan$, viewPay$, page$ }) => O.merge(
  goScan$.mapTo(true)
, O.merge(viewPay$, page$.filter(p => p.pathname != '/scan')).mapTo(false)
)

// Lock page orientation
exports.orient = page$ => page$.map(p => p.pathname == '/scan' ? 'portrait' : 'unlock')
