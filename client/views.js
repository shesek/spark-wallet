import { Observable as O } from 'rxjs'
import { h, link, nav, small, strong, ul, li, pre, div, p, h2, h3, h4, select, option, button, optgroup, label, span, input, form, img, a, video } from '@cycle/dom'

import YAML from 'js-yaml'
import qrcode from 'qrcode'
import vagueTime from 'vague-time'

const yaml = data => pre('.mt-4.text-left.text-muted', YAML.safeDump(data))
const qruri = inv => qrcode.toDataURL(`lightning:${ inv.bolt11  }`.toUpperCase()/*, { margin: 0, width: 300 }*/)
const ago = ts => vagueTime.get({ to: Math.min(ts*1000, Date.now()) })

const numItems = 100

const formGroup = (labelText, control, help) => div('.form-group', [
  label(labelText)
, control
, help ? small('.form-text.text-muted', help) : ''
])

const alertBox = alert => div('.alert.alert-dismissable.alert-'+alert[0], [
  button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
, ''+alert[1]
])

const header = ({ theme, unitf, cbalance, expert, alert }) => [
  link({ attrs: { rel: 'stylesheet', href: `assets/bootswatch/${theme}/bootstrap.min.css` } })
, nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    a('.navbar-brand', { attrs: { href: '#/' } }, 'NanoPay' + (expert ? ' 🔧' : ''))
  , cbalance != null ? span('.toggle-unit.navbar-brand.mr-0', unitf(cbalance)) : ''
  ]))
, alert ? div('.container', alertBox(alert)) : ''
]

const footer = ({ theme, info }) => h('footer.container.clearfix.small.text-muted.border-top.pt-2.my-2', [
  p('.info.float-left.mb-0', `${info.version.replace(/-.*-g/, '-')} · ${info.network} #${info.blockheight} · id:${info.id.substr(0,10)}`)
, p('.theme.float-right.mb-0', theme)
])

const home = ({ info, rate, moves, peers, expert, unitf }) => div([
  div('.row.mb-2', [
    div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-primary.btn-block', { attrs: { href: '#/scan' } }, 'Pay'))
  , div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-secondary.btn-block', { attrs: { href: '#/recv' } }, 'Request'))
  ])

, expert ? div('.row.mb-2', [
    div('.col-sm-6', a('.btn.btn-lg.btn-info.btn-block.mb-2', { attrs: { href: '#/logs' } }, 'Logs'))
  , div('.col-sm-6', a('.btn.btn-lg.btn-warning.btn-block.mb-2', { attrs: { href: '#/rpc' } }, 'RPC'))
  ]) : ''

, ul('.list-group.payments', moves.slice(0, numItems).map(m =>
    li('.list-group-item', [
      div('.d-flex.justify-content-between.align-items-center', [
        m.type === 'in' ? span('.badge.badge-success.badge-pill', `+${ unitf(m.msatoshi) }`)
                        : span('.badge.badge-danger.badge-pill', `-${ unitf(m.msatoshi) }`)
      , span('.badge.badge-secondary.badge-pill', ago(m.ts))
      ])
    , expert ? yaml(m.pay||m.inv) : ''
    ])).concat(moves.length > numItems ? [ li('.list-group-item.disabled', `(${moves.length-numItems} more older items`) ] : []))
    // @TODO paging

, expert ? yaml({ info, rate, peers }) : ''
])

const scan = div('.text-center.text-md-left', [
, div('.scanqr')
//, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

const confirmPay = payreq => ({ expert, unitf }) => div('.confirm', [
  h2('Confirm payment')
, p([ 'Are you sure you want to pay ', strong(unitf(payreq.msatoshi)), '?'])
, payreq.description ? p([ 'Description: ', span('.text-muted', payreq.description) ]) : ''
, button('.btn.btn-lg.btn-primary', { attrs: { do: 'confirm-pay' }, dataset: payreq }, `Pay ${unitf(payreq.msatoshi)}`)
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
, expert ? yaml(payreq) : ''
])

const recv = ({ unit }) => form({ dataset: { do: 'newinv' } }, [
  h2('Request payment')
, formGroup('Payment amount'
  , div('.input-group', [
      input('.form-control.form-control-lg'
        // @TODO update min/step according to unit
      , { attrs: { type: 'number', min: '0.001', step: '0.001', name: 'satoshi', placeholder: '(optional)', autofocus: true } })
    , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
    ]))

, formGroup('Description'
  , input('.form-control.form-control-lg', { attrs: { type: 'text', name: 'description', placeholder: '(optional)' } })
  , 'Embedded in the QR and presented to the payer.')

, button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Request')
, ' '
, a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Cancel')
])

const invoice = inv => qruri(inv).then(qr => ({ expert, unitf }) =>
  div('.text-center.text-md-left', [
    h2('Waiting for payment')
  , inv.msatoshi !== 'any' ? h3('.toggle-unit', unitf(inv.msatoshi)) : ''
  , img('.qr', { attrs: { src: qr } })
  , small('.d-block.text-muted.break-word', inv.bolt11)
  //, a('.btn.btn-lg.btn-secondary.mt-3', { attrs: { href: '#/' } }, 'Cancel')
  , expert ? yaml(inv) : ''
  ]))

module.exports = { header, footer, home, scan, confirmPay, recv, invoice, logs: yaml }
