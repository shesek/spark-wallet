import { div, img, h2, h4, small, a, button, p } from '@cycle/dom'
import { yaml, qruri } from './util'

const labelType = { bech32: 'Bech32', 'p2sh-segwit': 'P2SH' }
    , otherType = { bech32: 'p2sh-segwit', 'p2sh-segwit': 'bech32' }

export const deposit = ({ address, type }) => qruri(`bitcoin:${address}`).then(qr => ({ funds, obalance, unitf, conf: { expert } }) =>
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
      a('.btn.btn-primary.btn-lg.mb-1', { attrs: { href: `bitcoin:${address}` } }, 'Fund with wallet')
    , ' '
    , button('.btn.btn-secondary.btn-lg.mb-1', { dataset: { newaddrType: otherType[type] } }, `Switch to ${labelType[otherType[type]]}`)
    ])
  , p('.text-center', `Current on-chain balance: ${ unitf(obalance) }`)
  , p('.text-muted.small', 'Note: c-lightning does not process unconfirmed payments. You will not receive a notification for the payment, please check back once its confirmed.')
  , expert ? yaml({ outputs: funds.outputs }) : ''
  ]))
