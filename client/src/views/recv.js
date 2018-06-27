import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup, yaml, qrinv, amountField } from './util'

const recv = ({ amtData }) =>
  form({ attrs: { do: 'new-invoice' } }, [
    h2('Request payment')
  , formGroup('Payment amount', amountField(amtData, 'msatoshi', false))

  , formGroup('Description'
    , input('.form-control.form-control-lg', { attrs: { type: 'text', name: 'description', placeholder: '(optional)' } })
    , 'Embedded in the QR and presented to the payer.')

  , button('.btn.btn-lg.btn-primary.mb-2', { attrs: { type: 'submit' } }, 'Request')
  , ' '
  , a('.btn.btn-lg.btn-secondary.mb-2', { attrs: { href: '#/' } }, 'Cancel')
  ])

const invoice = inv => qrinv(inv).then(qr => ({ unitf, conf: { expert } }) =>
  div('.waiting-payment', [
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('Waiting for payment')
      , inv.msatoshi !== 'any' ? h3('.toggle-unit', unitf(inv.msatoshi)) : ''
      , small('.d-none.d-sm-block.text-muted.break-all.mt-3', inv.bolt11)
      ])
    , div('.col-sm-6.text-center.text-sm-right', [
        img('.qr', { attrs: { src: qr } })
      , small('.d-block.d-sm-none.text-center.text-muted.break-all.mt-3', inv.bolt11)
      ])

    ])
  , expert ? yaml(omitKey('bolt11', inv)) : ''
  ]))

const omitKey = (k, { [k]: _, ...rest }) => rest

module.exports = { recv, invoice }
