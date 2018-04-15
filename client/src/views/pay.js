import { div, form, button, textarea, a, span, p, strong, h2 } from '@cycle/dom'
import { formGroup, yaml } from './util'

const scanReq = div('.text-center.text-md-left', [
  a('.btn.btn-lg.btn-primary.mb-3', { attrs: { href: '#/payreq' } }, 'Paste request')
, process.env.BUILD_TARGET == 'web' ? div('.scanqr') : ''
])


const pasteReq = form({ attrs: { do: 'decode-pay' } }, [
  formGroup('Payment request'
  , textarea('.form-control.form-control-lg', { attrs: { name: 'bolt11', required: true } }))
, button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Decode request')
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

// @TODO show expiry
// @TODO input amount for 'any' invoice
const confirmPay = payreq => ({ unitf, conf: { expert } }) =>
  payreq.msatoshi
  ? div([
      h2('Confirm payment')
    , p([ 'Do you want to pay ', strong(unitf(payreq.msatoshi)), '?'])
    , payreq.description ? p([ 'Description: ', span('.text-muted', payreq.description) ]) : ''
    , button('.btn.btn-lg.btn-primary', { attrs: { do: 'confirm-pay' }, dataset: payreq }, `Pay ${unitf(payreq.msatoshi)}`)
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    , expert ? yaml(payreq) : ''
    ])
  : p('Custom invoice amounts are currently unsupported.')

module.exports = { scanReq, pasteReq, confirmPay }
