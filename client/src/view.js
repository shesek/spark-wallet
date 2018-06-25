import { Observable as O } from './rxjs'
import { combine, toObs, recvAmt } from './util'
import views from './views'

const isFunc = x => typeof x == 'function'

exports.vdom = ({ state$, goHome$, goScan$, goSend$, goRecv$, goNode$, goRpc$, payreq$, invoice$, logs$ }) => {
  const body$ = O.merge(
    // user actions
    goHome$.startWith(1).mapTo(views.home)
  , goScan$.mapTo(views.scanReq)
  , goSend$.mapTo(views.pasteReq)
  , goRecv$.mapTo(views.recv)
  , goNode$.mapTo(views.nodeInfo)
  , goRpc$.mapTo(views.rpc)

  // server responses
  , payreq$.map(views.confirmPay)
  , invoice$.flatMap(views.invoice)
  , logs$.map(views.logs)

  ).switchMap(view => isFunc(view) ? state$.map(view).flatMap(toObs) : O.of(view))


  // managed outside of cycle.js's vdom due to odd cache invalidation
  // behaviour exhibited by chrome that was causing slower pageloads
  // @xxx side effects outside of drivers!
  const themeLink = document.querySelector('link[href*=bootstrap]')
  state$.map(S => S.conf.theme).distinctUntilChanged()
    .subscribe(theme => themeLink.href = `swatch/${theme}/bootstrap.min.css`)

  return combine({ state$, body$ }).map(views.layout)
}

exports.navto = ({ incoming$: in$, outgoing$: out$, invoice$: inv$, payreq$ }) => O.merge(
  // navto '/' when receiving payments for the last invoice created by the user
  in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label).mapTo('/')
  // navto '/' after sending payments
, out$.mapTo('/')
  // navto '/confirm' when viewing a payment request
, payreq$.mapTo('/confirm')
)

exports.notif = ({ incoming$, state$ }) =>
  incoming$.withLatestFrom(state$, (inv, { unitf }) => `Received payment of ${ unitf(recvAmt(inv)) }`)

exports.orient = page$ => page$.map(p => p.pathname == '/scan' ? 'portrait' : 'unlock')
