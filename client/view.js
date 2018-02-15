import { Observable as O } from 'rxjs'
import views  from './views'
import { dbg, combine } from './util'

const isFunc = x => typeof x == 'function'

module.exports = (state$, { goHome$, goScan$, goRecv$, goRpc$, payreq$, invoice$, logs$ }) => {
  const body$ = O.merge(
    goHome$.startWith(1).mapTo(views.home)
  , goScan$.mapTo(views.scan)
  , goRecv$.mapTo(views.recv)
  , goRpc$.mapTo(views.rpc)

  , payreq$.map(views.confirmPay)
  , invoice$.flatMap(views.invoice)

  , logs$.map(views.logs)

  ).switchMap(view => isFunc(view) ? state$.map(view) : O.of(view))

  return combine({ state$, body$ }).map(views.layout)
}
