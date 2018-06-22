import { Observable as O } from './rxjs'

module.exports = ({ incoming$: in$, outgoing$: out$, invoice$: inv$, payreq$ }) => O.merge(
  // navto '/' when receiving payments for the last invoice created by the user
  in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label).mapTo('/')
  // navto '/' after sending payments
, out$.mapTo('/')
  // navto '/confirm' when viewing a payment request
, payreq$.mapTo('/confirm')
)
