import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup, yaml, qrinv, amountField, omitKey, fancyCheckbox, fmtSatAmountWithAlt } from './util'

const recv = ({ amtData, offersEnabled, invUseOffer }) =>
  // Wait for 'listconfigs' to tell us if offers support is enabled,
  // to prevent the UI from jumping around.
  offersEnabled == null ? div('.loader.inline')

: form({ attrs: { do: 'new-invoice' } }, [
    h2('Receive payment')
  , formGroup('Payment amount', amountField(amtData, 'msatoshi', false))

  , formGroup('Description'
    , input('.form-control.form-control-lg', { attrs: { type: 'text', name: 'description', placeholder: '(optional)' } })
    , 'Embedded in the QR and presented to the payer.')

  , offersEnabled ? fancyCheckbox('reusable-offer', 'Reusable offer (BOLT 12)', invUseOffer) : ''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Continue')
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
    ])

  , offersEnabled ? p(a('.small.text-muted', { attrs: { href: '#/scan' } }, 'Receive with a withdrawal offer »')) : ''
  ])

const invoice = inv => qrinv(inv).then(qr => ({ unitf, conf: { expert } }) =>
  div('.waiting-payment', [
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('Receive payment')
      , inv.msatoshi !== 'any' ? h3('.toggle-unit', fmtSatAmountWithAlt(inv.msatoshi, unitf)) : ''
      , small('.d-none.d-sm-block.text-muted.break-all.mt-3', inv.bolt11)
      ])
    , div('.col-sm-6.text-center', [
        img('.qr', { attrs: { src: qr } })
      , small('.d-block.d-sm-none.text-muted.break-all.mt-3', inv.bolt11)
      ])
    ])
  , expert ? yaml(omitKey('bolt11', inv)) : ''
  ]))

module.exports = { recv, invoice }
