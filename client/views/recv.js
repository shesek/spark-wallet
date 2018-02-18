import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup, yaml, qruri } from './util'

const recv = ({ unitf, conf: { unit }, recvForm: { msatoshi, amount, step } }) =>
  form({ attrs: { do: 'new-invoice' } }, [
    h2('Request payment')
  , formGroup('Payment amount'
    , div('.input-group', [
        input({ attrs: { type: 'hidden', name: 'msatoshi' }, props: { value: msatoshi } })
      , input('.form-control.form-control-lg'
        , { attrs: { type: 'number', step, min: step, name: 'amount', placeholder: '(optional)' }
          , props: { value: amount } })
      , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
      ]))

  , formGroup('Description'
    , input('.form-control.form-control-lg', { attrs: { type: 'text', name: 'description', placeholder: '(optional)' } })
    , 'Embedded in the QR and presented to the payer.')

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Request')
  , ' '
  , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
  ])

const invoice = inv => qruri(inv).then(qr => ({ unitf, conf: { expert } }) =>
  div('.text-center.text-md-left', [
    h2('Waiting for payment')
  , inv.msatoshi !== 'any' ? h3('.toggle-unit', unitf(inv.msatoshi)) : ''
  , img('.qr', { attrs: { src: qr } })
  , small('.d-block.text-muted.break-all.mt-3', inv.bolt11)
  , expert ? yaml(inv) : ''
  ]))

module.exports = { recv, invoice }
