import { div, form, button, textarea, a, span, p, strong, h2, ul, li, em, small } from '@cycle/dom'
import { showDesc, formGroup, yaml, amountField, fmtFiatAmount } from './util'

// user-agent sniffing is used purely to display suggestions to the user.
const hasCam = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    , isiOS = (/iP(hone|od|ad)/.test(navigator.platform) && navigator.vendor && navigator.vendor.includes('Apple'))
    , iOSVer = isiOS && +(navigator.appVersion.match(/OS (\d+)_\d+_/) || [])[1] || NaN
    , isPWAiOS = isiOS && navigator.standalone
    , camSuggest = hasCam ? null
      : iOSVer < 11 ? 'WebRTC is only available since iOS 11.2+.'
      : isPWAiOS ? 'PWAs on iOS cannot access WebRTC. Try opening Spark in your regular Safari browser without using "Add to homescreen".'
      : isiOS ? 'On iOS, only Safari can access WebRTC. Try changing or updating your browser.'
      : process.env.BUILD_TARGET == 'web' && location.protocol != 'https:' ? 'WebRTC requires using a secure https connection.'
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
  , textarea('.form-control.form-control-lg', { attrs: { name: 'paystr', required: true, rows: 5 } }))
, button('.btn.btn-lg.btn-primary.mb-2', { attrs: { type: 'submit' } }, 'Decode request')
, ' '
, a('.btn.btn-lg.btn-secondary.mb-2', { attrs: { href: '#/' } }, 'Cancel')
, hasCam ? '' : p('.text-muted.mt-4.small', 'Your browser does not support WebRTC, which is requires for scanning QRs with your camera. '+camSuggest)
])

// User confirmation for BOLT11/BOLT12 payment requests
const confirmPay = payreq => ({ unitf, amtData, conf: { expert } }) => {

  // If the original offer had a fiat-denominated amount, exclude the 'msat' field
  // from being displayed in the changes list. The bitcoin and fiat amounts are
  // displayed separately.
  if (payreq.offer && !payreq.offer.msatoshi && payreq.offer.amount && payreq.msatoshi) {
    delete payreq.changes.msat
  }

  return form('.conf-pay', { attrs: { do: 'confirm-pay' }, dataset: payreq }, [
    h2('Send payment')

  , payreq.vendor != null ? p([ 'Vendor: ', span('.text-muted.break-word', payreq.vendor) ]) : ''

  , showDesc(payreq) ? p([ 'Description: ', span('.text-muted.break-word', payreq.description) ]) : ''

  ,
    // Bitcoin-denominated amount that was previously displayed in fiat
    (payreq.msatoshi && payreq.offer && payreq.offer.amount)
    ? div('.form-group', [
        p('.mb-0', [ 'Amount to pay: ', strong('.toggle-unit', unitf(payreq.msatoshi)) ])
      , div('.form-text.text-muted', [ 'Quoted as: ', strong(fmtFiatAmount(payreq.offer, payreq.quantity)) ])
      ])

    // Bitcoin denominated amount
    : payreq.msatoshi
    ? p([ 'Amount to pay: ', strong('.toggle-unit', unitf(payreq.msatoshi)) ])

    // Amount chosen by the payer
    : formGroup('Enter amount to pay:', amountField(amtData, 'custom_msat', true))

  , payreq.quantity ? p([ 'Quantity: ', span('.text-muted', payreq.quantity) ]) : ''

  , ...(payreq.changes && Object.keys(payreq.changes).length > 0 ? [
      div('.mb-3.text-warning', 'This invoice differs from the original payment offer, do you still approve paying it?')
    , ul([
        payreq.changes.description_appended ? li([ 'The description was appended with: ', em('.text-muted', payreq.changes.description_appended) ]) : ''
      , payreq.changes.description ? li([ 'The description was completely replaced. The original was: ', em('.text-muted', payreq.changes.description) ]) : ''
      , payreq.changes.vendor_removed ? li([ 'The vendor name was removed. The original was: ', em('.text-muted', payreq.changes.vendor_removed) ]) : ''
      , payreq.changes.vendor ? li([ 'The vendor name was replaced. The original was: ', em('.text-muted', payreq.changes.vendor) ]) : ''
      , payreq.changes.msat ? li([ 'The amount was changed. The original was: ', em('.text-muted', unitf(payreq.changes.msat.slice(0,-4))) ]) : ''
      ])
    ] : [])

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }
      , payreq.msatoshi ? `Pay ${unitf(payreq.msatoshi)}` : 'Send Payment')
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , expert ? yaml(payreq) : ''
  ])
}

module.exports = { scanReq, pasteReq, confirmPay }
