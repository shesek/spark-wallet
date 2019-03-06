import { div, img, h2, h4, span, a, p, button, form, input } from '@cycle/dom'
import { yaml, qruri, formGroup, amountField, fancyCheckbox } from './util'

const labelType = { bech32: 'Bech32', 'p2sh-segwit': 'P2SH' }
    , otherType = { bech32: 'p2sh-segwit', 'p2sh-segwit': 'bech32' }

// Encode bech32 as uppercase to enable the more compact alphanumeric QR mode
const addrQr = (address, type) => qruri(`bitcoin:${type == 'bech32' ? address.toUpperCase() : address}`)

export const deposit = ({ address, type }) => addrQr(address, type).then(qr => ({ funds, obalance, unitf, conf: { expert } }) =>
  div('.onchain-deposit', [
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('On-chain deposit')
      , p(`To add funds to your Lightning node, send a payment to the ${labelType[type]} address below:`)
      , h4('.break-all.my-3', address)
      ])
    , div('.col-sm-6.text-center', [
        img('.qr', { attrs: { src: qr } })
      ])
    ])
  , div('.my-4.text-center', [
      a('.btn.btn-primary.btn-lg.mb-1', { attrs: { href: `bitcoin:${address}` } }, 'Open wallet')
    , ' '
    , button('.btn.btn-secondary.btn-lg.mb-1', { dataset: { newaddrType: otherType[type] } }, `Switch to ${labelType[otherType[type]]}`)
    ])
  , p('.text-center', `Current on-chain balance: ${ unitf(obalance) }`)
  , p('.text-muted.small', 'Note: c-lightning does not process unconfirmed payments. You will not receive a notification for the payment, please check back once its confirmed.')
  , expert ? yaml({ outputs: funds && funds.outputs }) : ''
  ]))

  export const withdraw = ({ amtData, fundMax, obalance, unitf, conf: { unit, expert } }) => {
    const availText = obalance != null ? `Available: ${unitf(obalance)}` : ''
  
    return form({ attrs: { do: 'exec-withdraw' } }, [
      h2('On-chain withdraw')
  
    , formGroup('Address', input('.form-control.form-control-lg' , { attrs: {
        name: 'address', required: true } }))
  
    , formGroup('Withdraw Amount', div([
        !fundMax
          ? amountField(amtData, 'amount_sat', true, availText)
          : div('.input-group', [
              input({ attrs: { type: 'hidden', name: 'amount_sat', value: 'all' } })
            , input('.form-control.form-control-lg.disabled', { attrs: { disabled: true, placeholder: availText } })
            , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
            ])
      , fancyCheckbox('withdraw-fund-max', 'Withdraw All', fundMax, '.btn-sm')
      ]))
  
    , expert ? formGroup('Fee rate', input('.form-control.form-control-lg'
               , { attrs: { type: 'text', name: 'feerate', placeholder: '(optional)'
                          , pattern: '[0-9]+(perk[bw])?|slow|normal|urgent' } })) : ''
  
    , div('.form-buttons', [
        button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Withdraw')
      ])
    ])
  }