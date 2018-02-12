import { Observable as O } from 'rxjs'
import { nav, small, ul, li, pre, div, p, h2, h3, h4, table, thead, tr, td, tbody, select, option, button, optgroup, label, span, input, form, img, a, video } from '@cycle/dom'

import qrcode from 'qrcode'
import vagueTime from 'vague-time'

const formatNum = require('format-number')({ round: 3 })
const json = data => pre(require('js-yaml').safeDump(data))
const qruri = inv => qrcode.toDataURL(`lightning:${ inv.bolt11  }`.toUpperCase()/*, { margin: 0, width: 300 }*/)
const ago = ts => vagueTime.get({ to: Math.min(ts*1000, Date.now()) })
const sat = msat => `${ formatNum(msat/1000) } sat`

const formGroup = (labelText, control, help) => div('.form-group', [
  label(labelText)
, control
, help ? small('.form-text.text-muted', help) : ''
])

const loading = isLoading => !isLoading ? '' : div('.mt-3.text-center', h3('LOADING'))

const alertBox = alert => !alert ? '' : div('.alert.alert-dismissable.alert-'+alert[0], [
  button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' }, props: { innerHTML: '&times;' } })
, alert[1]
])

const navbar = ({ cbalance }) =>
  nav('.navbar.navbar-dark.bg-primary.mb-3', div('.container', [
    a('.navbar-brand', { attrs: { href: '#/' } }, 'FlashWallet')
  , cbalance != null ? span('.navbar-brand.mr-0', sat(cbalance)) : ''
  ]))

const home = ({ history, expert }) => div([
  div('.row', [
    div('.col-sm-6', a('.btn.btn-lg.btn-primary.btn-block.mb-2', { attrs: { href: '#/scan' } }, 'Pay'))
  , div('.col-sm-6', a('.btn.btn-lg.btn-secondary.btn-block.mb-2', { attrs: { href: '#/recv' } }, 'Request'))
  ])

, !expert ? '' : div('.row', [
    div('.col-sm-6', a('.btn.btn-lg.btn-info.btn-block.mb-2', { attrs: { href: '#/logs' } }, 'Logs'))
  , div('.col-sm-6', a('.btn.btn-lg.btn-warning.btn-block.mb-2', { attrs: { href: '#/rpc' } }, 'RPC'))
  ])

, ul('.list-group.payments', history.map(h =>
    li('.list-group-item.d-flex.justify-content-between.align-items-center', [
      //h.type === 'in' ? span('.text-success', `Received ${ sat(h.msatoshi_received) }`)
      //                : span('.text-warning', `Sent ${ sat(h.msatoshi) } to ${ h.destination.substr(0, 6) }`)
      h.type === 'in' ? span('.badge.badge-success.badge-pill', `+${ sat(h.msatoshi) }`)
                      : span('.badge.badge-danger.badge-pill', `-${ sat(h.msatoshi) }`)
    , span('.badge.badge-secondary.badge-pill', ago(h.ts))
    ])))

//, json({ peers: S.peers })
])

const scan = div('.text-center.text-md-left', [
, div('.scanqr')
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

const confirmPay = payreq => div('.confirm', [
  json(payreq)
, button('.btn.btn-lg.btn-primary', { dataset: { do: 'confirm-pay', bolt11: payreq.bolt11, msatoshi: payreq.msatoshi } }, `Pay ${sat(payreq.msatoshi)}`)
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

const paySuccess = json

const recv = form({ dataset: { do: 'newinv' } }, [
  h2('Request payment')
, formGroup('Payment amount'
  , div('.input-group', [
      input('.form-control.form-control-lg', { attrs: { type: 'number', min: '0.001', step: '0.001', name: 'satoshi', placeholder: '(optional)' } })
    , div('.input-group-append', span('.input-group-text', 'sat'))
    ]))

, formGroup('Description'
  , input('.form-control.form-control-lg', { attrs: { type: 'text', name: 'description', placeholder: '(optional)' } })
  , 'Embedded in the QR and presented to the payer.')

, button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Request')
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

const recvInv = inv => O.from(qruri(inv)).map(qr =>
  div('.text-center.text-md-left', [
    h2('Waiting for payment')
  , inv.msatoshi !== 'any' ? h3(sat(inv.msatoshi)) : ''
  , img('.qr', { attrs: { src: qr } })
  , small('.d-block.text-muted.break-word', inv.bolt11)
  , a('.btn.btn-lg.btn-secondary.mt-3', { attrs: { href: '#/' } }, 'Cancel')
  //, json(inv)
  ]))

const recvSuccess = inv => div([
  json(inv)
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Return home')
])

const logs = json

module.exports = { alertBox, loading, navbar, home, scan, confirmPay, paySuccess, recv, recvInv, recvSuccess, logs }
