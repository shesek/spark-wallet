import { div, ul, li, a, span, button, small, p, strong } from '@cycle/dom'
import { yaml, ago } from './util'
import ordinal from 'ordinal'

const perPage = 10

const home = ({ feed, feedStart, feedActive, unitf, conf: { expert } }) => !feed ? '' : div([

  div('.row.mb-2', [
    div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-primary.btn-block', { attrs: { href: '#/scan' } }, 'Pay'))
  , div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-secondary.btn-block', { attrs: { href: '#/recv' } }, 'Request'))
  , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-info.btn-block.mb-2', { attrs: { href: '#/logs' } }, 'Logs')) : ''
  , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-warning.btn-block.mb-2', { attrs: { href: '#/rpc' } }, 'Console')) : ''
  ])

, ...(!feed.length ? [ p('.text-center.text-muted.mt-4', 'You have no incoming or outgoing payments.') ] : [
    ul('.list-group.feed', feed.slice(feedStart, feedStart+perPage).map(([ type, ts, msat, obj, fid=makeId(type, obj) ]) =>
      li('.list-group-item'+(feedActive == fid ? '.active' : '.list-group-item-action'), { dataset: { feedToggle: fid } }, [
        div('.clearfix', [
          type === 'in' ? span('.amt.badge.badge-success.badge-pill', `+${ unitf(msat) }`)
                        : span('.amt.badge.badge-danger.badge-pill', `-${ unitf(msat) }`)
        , span('.ts.badge.badge-secondary.badge-pill.float-right', { attrs: { title: new Date(ts*1000).toLocaleString() } }, ago(ts))
        ])
      , feedActive != fid ? '' : ul('.list-unstyled.my-3', [
          li([ strong(type == 'in' ? 'Received:' : 'Sent:'), ' ', new Date(ts*1000).toLocaleString() ])
        , type == 'in' && obj.msatoshi_received > obj.msatoshi ? li([ strong('Overpayment:'), ' ', unitf(obj.msatoshi_received-obj.msatoshi) ]) : ''
        , type == 'out' && obj.msatoshi ? li([ strong('Fee:'), ' ', feesText(obj, unitf) ]) : ''
        , type == 'out' && obj.route ? li([ strong('Route:'), ' ', obj.route.length > 1 ? `${obj.route.length} hops` : 'direct payment'
                                                            , ' ', small(`(${ordinal(obj.sendpay_tries)} attempt)`) ]) : ''
        , type == 'out' ? li([ strong('Destination:'), ' ', small('.break-all', obj.destination) ]) : ''
        , li([ strong('Payment hash:'), ' ', small('.break-all', obj.payment_hash) ])
        , expert ? li(yaml(obj)) : ''
        ])
      ])
    ))
  , paging(feed.length, feedStart)
  ])

])

const makeId = (type, obj) => `${type}-${obj.id || obj.pay_index}`

const feesText = ({ msatoshi: quoted, msatoshi_sent: sent }, unitf) =>
  `${unitf(sent-quoted)} (${((sent-quoted)/quoted*100).toFixed(2)}%)`

const paging = (total, start) => total <= perPage ? '' :
  div('.d-flex.justify-content-between.mt-2', [
    pageLink('newer', start > 0 ? start-perPage : null)
  , small('.align-self-center.text-muted', `showing ${+start+1} to ${Math.min(total, +start+perPage)} of ${total}`)
  , pageLink('older', start+perPage < total ? start+perPage : null)
  ])

const pageLink = (label, start, active) =>
  start == null ? button('.btn.btn-sm.btn-link.invisible', label)
                : button('.btn.btn-sm.btn-link', { dataset: { feedStart: ''+start } }, label)

module.exports = { home }
