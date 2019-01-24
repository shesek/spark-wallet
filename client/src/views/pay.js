import { div, form, button, textarea, a, span, p, strong, h2 } from '@cycle/dom'
import { showDesc, formGroup, yaml, amountField } from './util'

// user-agent sniffing is purely for display suggestions to the user.
const hasCam = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    , isiOS = (/iP(hone|od|ad)/.test(navigator.platform) && navigator.vendor && navigator.vendor.includes('Apple'))
    , iOSVer = isiOS && +(navigator.appVersion.match(/OS (\d+)_\d+_/) || [])[1] || NaN
    , isPWAiOS = isiOS && navigator.standalone
    , camSuggest = hasCam ? null
      : iOSVer < 11 ? 'WebRTC is only available since iOS 11.2+.'
      : isPWAiOS ? 'PWAs on iOS cannot access WebRTC. Try opening Spark in your regular Safari browser without using "Add to homescreen".'
      : isiOS ? 'On iOS, only Safari can access WebRTC. Try changing or updating your browser.'
      : 'Try updating your browser.'

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
, hasCam ? '' : p('.text-muted.mt-4.small', 'Your browser does not support WebRTC, which is requires for scanning QRs with your camera. '+camSuggest)
])

// @TODO show expiry
const confirmPay = payreq => ({ unitf, amtData, conf: { expert } }) =>
  form('.conf-pay', { attrs: { do: 'confirm-pay' }, dataset: payreq }, [
    ...(payreq.msatoshi ? [
      h2('Confirm payment')
    , p([ 'Confirm paying ', strong('.toggle-unit', unitf(payreq.msatoshi)), '?'])
    ] : [
      h2('Send payment')
    , formGroup('Amount to pay', amountField(amtData, 'custom_msat', true))
    ])

  , showDesc(payreq) ? p([ 'Description: ', span('.text-muted.break-word', payreq.description) ]) : ''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, payreq.msatoshi ? `Pay ${unitf(payreq.msatoshi)}` : 'Send Payment')
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , expert ? yaml(payreq) : ''
  ])

module.exports = { scanReq, pasteReq, confirmPay }
