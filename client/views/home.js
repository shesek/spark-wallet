import { div, ul, li, a, span } from '@cycle/dom'
import { yaml, ago } from './util'

const numItems = 10

const home = ({ feed, unitf, info, btcusd, peers, funds, conf: { expert } }) => div([
  div('.row.mb-2', [
    div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-primary.btn-block', { attrs: { href: '#/scan' } }, 'Pay'))
  , div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-secondary.btn-block', { attrs: { href: '#/recv' } }, 'Request'))
  , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-info.btn-block.mb-2', { attrs: { href: '#/logs' } }, 'Logs')) : ''
  , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-warning.btn-block.mb-2', { attrs: { href: '#/rpc' } }, 'Console')) : ''
  ])

, ul('.list-group.payments', feed.slice(0, numItems).map(([ type, ts, msat, obj ]) =>
    li('.list-group-item', [
      div('.clearfix', [
        type === 'in' ? span('.badge.badge-success.badge-pill', `+${ unitf(msat) }`)
                      : span('.badge.badge-danger.badge-pill', `-${ unitf(msat) }`)
      , ago('.badge.badge-secondary.badge-pill.float-right', ts)
      ])
    , expert ? yaml(obj) : ''
    ])).concat(feed.length > numItems ? [ li('.list-group-item.disabled', `(${feed.length-numItems} more older items)`) ] : []))
    // @TODO paging

, expert ? yaml({ info, btcusd, peers, funds }) : ''
])


module.exports = { home }
