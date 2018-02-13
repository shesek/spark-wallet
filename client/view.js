import { Observable as O } from 'rxjs'
import { div, hr } from '@cycle/dom'
import views  from './views'

const isFunc = x => typeof x == 'function'

module.exports = ({ state$, goHome$, goScan$, goRecv$, payreq$, invoice$, logs$ }) => {
  const
    head$ = state$.map(views.header)
  , foot$ = state$.map(views.footer)
  , body$ = O.merge(
      goHome$.startWith(1).mapTo(views.home)
    , goScan$.mapTo(views.scan)
    , goRecv$.mapTo(views.recv)

    , payreq$.map(views.confirmPay)
    , invoice$.flatMap(views.invoice)

    , logs$.map(views.logs)

    ).switchMap(view => isFunc(view) ? state$.map(view) : O.of(view))

  return O.combineLatest(head$, body$, foot$, (head, body, foot) =>
    div('.d-flex.flex-column', [ ...head, div('.container.flex-grow', body), foot ]) )
}

const addQR = inv => O.from(qruri(inv)).map(qr => ({ ...inv, qr }))
