import { Observable as O } from 'rxjs'
import { div, hr } from '@cycle/dom'
import views  from './views'
import { dbg, combine } from './util'

const isFunc = x => typeof x == 'function'

module.exports = ({ state$, goHome$, goScan$, goRecv$, goRpc$, payreq$, invoice$, logs$ }) => {
  const
    head$ = state$.map(views.header)
  , foot$ = state$.map(views.footer)
  , body$ = O.merge(
      goHome$.startWith(1).mapTo(views.home)
    , goScan$.mapTo(views.scan)
    , goRecv$.mapTo(views.recv)
    , goRpc$.mapTo(views.rpc).do(x=>console.log('goRpc', x))

    , payreq$.map(views.confirmPay)
    , invoice$.flatMap(views.invoice)

    , logs$.map(views.logs)

    ).switchMap(view => isFunc(view) ? state$.map(view) : O.of(view))

  dbg({ body$ }, 'flash:view')

  return combine({ head$, body$, foot$ }).map(views.layout)
}
