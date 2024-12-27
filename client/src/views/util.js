import Big from 'big.js'
import YAML from 'js-yaml'
import qrcode from 'qrcode'
import numbro from 'numbro'
import vagueTime from 'vague-time'
import { div, span, pre, label, small, input, button, a, strong } from '@cycle/dom'
import { isConnError } from '../util'

const isOnion = global.location && /\.onion$/.test(location.hostname)

export const yaml = data => pre('.mt-3.text-left.text-muted', typeof data == 'string' ? data : YAML.dump(data))

// use server-generated QRs when browsed over .onion
// (the canvas fingerprint protection in Tor Browser breaks client-side generation)
export const qruri = process.env.BUILD_TARGET == 'web' && isOnion
  ? data => Promise.resolve(`qr/${ encodeURIComponent(data) }`)
  : data => qrcode.toDataURL(data)

export const qrinv = inv => qruri(`lightning:${ inv.bolt11 || inv.bolt12_unsigned  }`.toUpperCase())

// Avoid displaying our default description (of "⚡")
export const showDesc = o => o.description && o.description !== '⚡'

export const ago = ts => vagueTime.get({ to: Math.min(ts*1000, Date.now()) })

export const formGroup = (labelText, control, help) => div('.form-group', [
  label('.col-form-label.col-form-label-lg', labelText)
, control
, help ? small('.form-text.text-muted', help) : ''
])

export const amountField = ({ amount_msat, amount, step, unit }, msatField, required, placeholder) =>
  div('.input-group', [
    input({ attrs: { type: 'hidden', name: msatField }, props: { value: amount_msat } })
  , input('.form-control.form-control-lg'
    , { attrs: { type: 'number', step, min: step, name: 'amount', required, placeholder: placeholder||(required?'':'(optional)') }
      , props: { value: amount } })
  , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
  ])

export const alertBox = ([ kind, text ], dismissable) =>
  div(`.alert${dismissable?'.alert-dismissable':''}.alert-${kind}`, [
    dismissable ? button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×') : ''

  , text.toString()

  , ' ', process.env.BUILD_TARGET != 'web' && isConnError(text)
    ? a('.alert-link', { attrs: { href: 'settings.html', rel: 'external' } }, 'Try configuring a different server?')
    : ''
  ])

export const fancyCheckbox = (name, desc, checked, klass='') => {
  klass += checked ? '.btn-primary' : '.btn-secondary'
  return div('.fancy-checkbox.mt-3', [
    input({ attrs: { id: name, name, type: 'checkbox', autocomplete: 'off', checked } })
  , div('.btn-group', [
      label('.btn'+klass, { attrs: { for: name } })
    , label('.btn.active'+klass, { attrs: { for: name } }, desc)
    ])
  ])
}

export const omitKey = (k, { [k]: _, ...rest }) => rest

export const pluralize = (strs, n) => `${strs[0]}${n}${strs[1]}${n == 0 || n>1 ? 's' : ''}`

export const fmtSatAmountWithAlt = (amount_msat, unitf) => span([
  strong(unitf(amount_msat))
, fmtNullable(unitf(amount_msat, true), amt => small(` (${amt})`))
])

export const fmtNullable = (value, format, null_format='') =>
  value != null ? format(value) : null_format

export const fmtOfferFiatAmount = ({ amount, currency, minor_unit }, quantity=1) => {
  const amount_fmt = numbro(
    Big(amount).div(Math.pow(10, minor_unit)).mul(quantity).toFixed(minor_unit)
  ).format({ thousandSeparated: true, mantissa: minor_unit, optionalMantissa: true })

  return `${amount_fmt} ${currency}`
}

export const getPricePerUnit = ({ amount_msat, quantity }) =>
  Big(amount_msat).div(quantity).toFixed(0)
