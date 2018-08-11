import { div, form, button, textarea, a, span, p, strong, h2 } from '@cycle/dom'
import { formGroup, yaml, amountField } from './util'

const hasCam = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

const scanReq = div('.qr-scanner', [
  // the camera itself is displayed by the driver in the background,
  // outside of cycle.js vdom management. here we just display the scanning area indicator
  // and the button to switch to manual entry.

  div('.indicator', [div('.bordertop'), div('.borderbottom')])

, div('.buttons-wrap.py-3.main-bg', [
    p('.text-muted', 'or')
  , a('.btn.btn-lg.btn-primary', { attrs: { href: '#/payreq' } }, 'Paste request')
  ])

])

const pasteReq = form({ attrs: { do: 'decode-pay' } }, [
  formGroup('Payment request'
, textarea('.form-control.form-control-lg', { attrs: { name: 'bolt11', required: true, rows: 5 } }))
, button('.btn.btn-lg.btn-primary.mb-2', { attrs: { type: 'submit' } }, 'Decode request')
, ' '
, a('.btn.btn-lg.btn-secondary.mb-2', { attrs: { href: '#/' } }, 'Cancel')
, hasCam ? '' : p('.text-muted.mt-4.small', 'Your browser does not support WebRTC camera access. '
                                          + 'A newer browser would enable scanning a QR with the payment request.')
])

// @TODO show expiry
const confirmPay = payreq => ({ unitf, amtData, conf: { expert } }) =>
  form('.conf-pay', { attrs: { do: 'confirm-pay' }, dataset: payreq }, [
  , ...(payreq.msatoshi ? [
      h2('Confirm payment')
    , p([ 'Confirm paying ', strong('.toggle-unit', unitf(payreq.msatoshi)), '?'])
    ] : [
      h2('Send payment')
    , formGroup('Amount to pay', amountField(amtData, 'custom_msat', true))
    ])
  , payreq.description ? p([ 'Description: ', span('.text-muted', payreq.description) ]) : ''
  , button('.btn.btn-lg.btn-primary.mb-2', { attrs: { type: 'submit' } }, payreq.msatoshi ? `Pay ${unitf(payreq.msatoshi)}` : 'Send Payment')
  , ' ', a('.btn.btn-lg.btn-secondary.mb-2', { attrs: { href: '#/' } }, 'Cancel')
  , expert ? yaml(payreq) : ''
  ])

module.exports = { scanReq, pasteReq, confirmPay }
