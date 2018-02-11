import { Observable as O } from 'rxjs'
import { div } from '@cycle/dom'
import views  from './views'

const content = ({  goHome$, goScan$, goRecv$, state$, payreq$, outgoing$, invoice$, logs$ }) => O.merge(
  goHome$.startWith(1).mapTo(state$.map(views.home))
, goScan$.mapTo(views.scan)
, goRecv$.mapTo(views.recv)

, payreq$.map(views.confirmPay)
//, outgoing$.map(views.paySuccess)
, invoice$.flatMap(views.recvInv)

, logs$.map(views.logs)

).switchMap(x => x instanceof O ? x : O.of(x))

module.exports = S =>
  O.combineLatest(S.state$.startWith({}).map(views.navbar), S.alert$.map(views.alertBox).startWith(''), content(S).startWith(''), S.loading$.map(views.loading)
  , (nav, alert, body, loading) => div([ nav, div('.container', [ alert, body ]), loading ]))
