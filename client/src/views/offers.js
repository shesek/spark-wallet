import { div, form, button, input, a, span, p, strong, h2, small } from '@cycle/dom'
import Big from 'big.js'
import { showDesc, formGroup, yaml, amountField } from './util'

// Display an offer to send a payment
// This is only used when user input is required to fulfill the offer (amount/quantity),
// and offers with quantity but no fixed amount are unsupported (rejected by the server side).
// This means that the user will be promoted for either the amount or the quantity,
// never for both.
const offerPay = offer => ({ unitf, amtData, offerPayQuantity, conf: { expert } }) =>
  form('.offer-pay', { attrs: { do: 'offer-pay' }, dataset: offer }, [
    h2('Send payment')

  , expert ? p([ 'Node ID: ', small('.text-muted.break-all', offer.node_id) ]) : ''
  , expert ? p([ 'Offer ID: ', small('.text-muted.break-all', offer.offer_id) ]) : ''

  , offer.vendor != null ? p([ 'Vendor: ', span('.text-muted.break-word', offer.vendor) ]) : ''
  // TODO warning

  , showDesc(offer) ? p([ 'Description: ', span('.text-muted.break-word', offer.description) ]) : ''

  , offer.msatoshi
      //? p([ 'Amount: ', strong('.toggle-unit', unitf(offer.msatoshi)) ])
      ? p([ 'Price per unit: ', strong('.toggle-unit', unitf(offer.msatoshi)) ])
      : formGroup('Amount to pay:', amountField(amtData, 'custom_msat', true))

  , offer.quantity_min != null ? formGroup('Quantity:'
    , input('.form-control.form-control-lg', { attrs: { type: 'number', name: 'quantity', value: offerPayQuantity
                                             , min: offer.quantity_min, max: offer.quantity_max, step: 1 } })
    ) : ''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }
      , offer.msatoshi ? `Pay ${unitf(mul(offer.msatoshi, offerPayQuantity))}` : 'Send Payment')
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , expert ? yaml(offer) : ''
  ])

// Display an offer to receive a payment
const offerRecv = offer => ({ unitf, conf: { expert} }) =>
  form('.offer-recv', { attrs: { do: 'offer-recv' }, dataset: offer }, [
    h2('Receive payment')

  , p([ 'You were offered a payment of ', strong('.toggle-unit', unitf(offer.msatoshi)), '. Do you accept it?' ])

  , expert ? p([ 'Node ID: ', small('.text-muted.break-all', offer.node_id) ]) : ''
  , expert ? p([ 'Offer ID: ', small('.text-muted.break-all', offer.offer_id) ]) : ''

  , offer.vendor != null ? p([ 'Vendor: ', span('.text-muted.break-word', offer.vendor) ]) : ''

  , showDesc(offer) ? p([ 'Description: ', span('.text-muted.break-word', offer.description) ]) : ''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }
      , `Receive ${unitf(offer.msatoshi)}`)
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , expert ? yaml(offer) : ''
  ])

export const offer = offer =>
  (offer.send_invoice ? offerRecv : offerPay)(offer)

const mul = (msatoshi, quantity=1) =>
  quantity == 1 ? msatoshi : Big(msatoshi).mul(quantity).toFixed(0)