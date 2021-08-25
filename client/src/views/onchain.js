import { div, img, h2, em, a, button, p } from '@cycle/dom'
import { yaml, qruri } from './util'

const labelType = { bech32: 'Bech32', 'p2sh-segwit': 'P2SH' }
    , otherType = { bech32: 'p2sh-segwit', 'p2sh-segwit': 'bech32' }

// Encode bech32 as uppercase to enable the more compact alphanumeric QR mode
const addrQr = (address, type) => qruri(`bitcoin:${type == 'bech32' ? address.toUpperCase() : address}`)

export const deposit = addresses => async ({ funds, obalance, depositAddrType: type, unitf, conf: { expert } }) =>
  div('.onchain-deposit', [
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('On-chain wallet')
      , p('To add funds to your Lightning node, send a payment to the address below:')
      , p('.break-all.my-3', addresses[type])
      ])
    , div('.col-sm-6.text-center', [
        img('.qr', { attrs: { src: await addrQr(addresses[type], type) } })
      ])
    ])
  , div('.my-4.text-center', [
      a('.btn.btn-primary.btn-lg.mb-1', { attrs: { href: `bitcoin:${addresses[type]}` } }, 'Open wallet')
    , ' '
    , button('.btn.btn-secondary.btn-lg.mb-1', { attrs: { do: 'toggle-addr-type' } }, `Switch to ${labelType[otherType[type]]}`)
    ])
  , p('.text-center.toggle-unit'
    , [ 'Current on-chain balance: ', obalance != null ? unitf(obalance) : em('loading...') ])
  , p('.text-muted.small', 'Note: c-lightning does not process unconfirmed payments. You will not receive a notification for the payment, please check back once its confirmed.')
  , expert ? yaml({ outputs: funds && funds.outputs }) : ''
  ])
