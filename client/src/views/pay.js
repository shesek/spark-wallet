import { div, form, button, textarea, a, span, p, strong, h2 } from '@cycle/dom'
import { formGroup, yaml, amountField } from './util'

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
, button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Decode request')
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

// @TODO show expiry
// @TODO input amount for 'any' invoice
const confirmPay = payreq => ({ unitf, amtData, conf: { expert } }) =>
  form('.conf-pay', { attrs: { do: 'confirm-pay' }, dataset: payreq }, [
    h2('Confirm payment')
  , ...(payreq.msatoshi ? [
      p([ 'Do you want to pay ', strong('.toggle-unit', unitf(payreq.msatoshi)), '?'])
    , payreq.description ? p([ 'Description: ', span('.text-muted', payreq.description) ]) : ''
    , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, `Pay ${unitf(payreq.msatoshi)}`)
    ] : [
      formGroup('Amount to pay', amountField(amtData, 'custom_msat'))
    , payreq.description ? p([ 'Description: ', span('.text-muted', payreq.description) ]) : ''
    , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Confirm Payment')
    ])
  , ' ', a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
  , expert ? yaml(payreq) : ''
  ])

module.exports = { scanReq, pasteReq, confirmPay }
