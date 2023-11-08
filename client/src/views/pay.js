import { div, form, button, textarea, a, span, p, strong, h2, ul, li, em, small } from '@cycle/dom'
import { showDesc, formGroup, yaml, amountField, fmtOfferFiatAmount, getPricePerUnit, fmtSatAmountWithAlt } from './util'

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

, hasCam ? p(a('.text-muted', { attrs: { href: '#/scan' } }, 'Scan QR with camera »'))
  : p('.text-muted.mt-4.small', 'Your browser does not support WebRTC, which is required for scanning QRs with your camera. '+camSuggest)
])

// User confirmation for BOLT11/BOLT12 payment requests
const confirmPay = payreq => ({ unitf, amtData, conf: { expert } }) => {

  // If the original offer had a fiat-denominated amount, exclude the 'msat' field
  // from being displayed in the changes list. The bitcoin and fiat amounts are
  // displayed separately.
  if (payreq.offer && !payreq.offer.amount_msat && payreq.offer.amount && payreq.amount_msat) {
    delete payreq.changes.msat
  }

  return form('.conf-pay', { attrs: { do: 'confirm-pay' }, dataset: payreq }, [
    h2('Send payment')

  , payreq.vendor ? p([ 'Issuer: ', span('.text-muted.break-word', payreq.vendor) ]) : ''

  , showDesc(payreq) ? p([ 'Description: ', span('.text-muted.break-word', payreq.description) ]) : ''

  ,
    // Bitcoin-denominated amount that was previously displayed in fiat
    (payreq.amount_msat && payreq.offer && payreq.offer.amount)
    ? div('.form-group', [
        p('.mb-0.toggle-unit', [ 'Final amount: ', fmtSatAmountWithAlt(payreq.amount_msat, unitf) ])
      , div('.form-text.text-muted', [ 'Quoted as: ', strong(fmtOfferFiatAmount(payreq.offer, payreq.quantity)) ])
      ])

    // Bitcoin denominated amount
    : payreq.amount_msat
    ? p('.toggle-unit', [ 'Amount: ', fmtSatAmountWithAlt(payreq.amount_msat, unitf) ])

    // Amount chosen by the payer
    : formGroup('Enter amount to pay:', amountField(amtData, 'custom_msat', true))

  , payreq.quantity ? div('.form-group', [
      p('.mb-0', [ 'Quantity: ', strong(payreq.quantity) ])
      , payreq.quantity > 1
        ? div('.form-text.text-muted', [ 'Per unit: ', fmtSatAmountWithAlt(getPricePerUnit(payreq), unitf) ]) : ''
    ]) : ''

  , ...(payreq.changes && Object.keys(payreq.changes).length > 0 ? [
      div('.mb-3.text-warning', 'This invoice differs from the original payment offer:')
    , ul([
       payreq.changes.msat ? li([ 'The amount was changed from ', ...displayAmountChange(payreq, unitf) ]) : ''
      , payreq.changes.description_appended ? li([ 'The description was appended with: ', em('.text-muted', payreq.changes.description_appended) ]) : ''
      , payreq.changes.description ? li([ 'The description was completely replaced. The original was: ', em('.text-muted', payreq.changes.description) ]) : ''
      , payreq.changes.vendor_removed ? li([ 'The vendor name was removed. The original was: ', em('.text-muted', payreq.changes.vendor_removed) ]) : ''
      , payreq.changes.vendor ? li([ 'The vendor name was replaced. The original was: ', em('.text-muted', payreq.changes.vendor) ]) : ''
      ])
    ] : [])

  , div('.form-buttons.mt-4', [
      div('.mb-3', 'Do you confirm making this payment?')
    , button('.btn.btn-lg.btn-primary.mb-1', { attrs: { type: 'submit' } }
      , payreq.amount_msat ? `Pay ${unitf(payreq.amount_msat)}` : 'Send Payment')
    , ' '
    , a('.btn.btn-lg.btn-secondary.mb-1', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , expert ? yaml(payreq) : ''
  ])
}

const displayAmountChange = ({ amount_msat: final, changes }, unitf) => {
  const original = +changes.msat
  const klass = final < original ? '.text-success' : '.text-danger'
  const change = final < original ? `${((1 - (final/original))*100).toFixed(1)}% less`
                                  : `${(((final/original) - 1)*100).toFixed(1)}% more`
  return [
    strong(unitf(original))
  , ' to '
  , strong(unitf(final))
  , ' '
  , span(klass, `(${change})`)
  ]
}

module.exports = { scanReq, pasteReq, confirmPay }
