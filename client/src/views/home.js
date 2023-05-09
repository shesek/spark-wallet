import { div, ul, li, a, span, button, small, p, strong, em } from '@cycle/dom'
import { yaml, ago, showDesc, pluralize } from './util'

const perPage = 10

const hasCam = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    , preferCam = hasCam && ('ontouchstart' in window)

const home = ({ feed, feedStart, feedActive, unitf, obalance, cbalance, channels, funds, conf: { expert } }) => {
  const balanceAvailable = !!(channels && funds)
      , displayLoader = !balanceAvailable || !feed

  return div([

    // Main buttons
    div('.row.mb-2', [
      div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-primary.btn-block', { attrs: { href: preferCam ? '#/scan' : '#/payreq' } }, 'Pay'))
    , div('.col-sm-6.mb-2', a('.btn.btn-lg.btn-secondary.btn-block', { attrs: { href: '#/recv' } }, 'Receive'))
    , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-info.btn-block.mb-2', { attrs: { href: '#/logs' } }, 'Logs')) : ''
    , expert ? div('.col-sm-6', a('.btn.btn-lg.btn-warning.btn-block.mb-2', { attrs: { href: '#/rpc' } }, 'Console')) : ''
    ])

    // Balance overview
  , balanceAvailable ? balanceOverview({ obalance, cbalance, channels, funds, unitf }) : ''

    // Payments feed
  , !feed || !balanceAvailable ? '' // hidden until the balance is available to prevent the UI from jumping around
    : !feed.length ? p('.text-center.text-muted.mt-4', 'You have no incoming or outgoing payments.')
    : div([
        ul('.list-group.feed', feed.slice(feedStart, feedStart+perPage).map(itemRenderer({ feedActive, unitf, expert })))
      , paging(feed.length, feedStart)
      ])

  , displayLoader ? div('.loader.inline') : ''

  ])
}

const itemRenderer = ({ feedActive, unitf, expert }) => ([ type, ts, msat, obj ]) => {
  const fid     = `${type}-${obj.payment_hash}`
      , visible = fid == feedActive
      , tsStr   = new Date(ts*1000).toLocaleString()
      , offerId = obj.local_offer_id || obj.offer_id
      , status  = type == 'in' ? 'complete' : obj.status // in payments are always completed, out payments may be pending/failed
      , tsLabel = status == 'complete' ? (type == 'in' ? 'Received:' : 'Sent:') : 'Time:'

  const leftBadge = type == 'out' && status == 'failed'
    ? span('.amt.badge.badge-warning.badge-pill', [ span('.icon.icon-cancel'), ' failed' ])
    : span(`.amt.badge.badge-${type=='in'?'success':'danger'}.badge-pill`, `${type == 'in' ? '+' : '-'}${ unitf(msat) }`)

  const rightBadge = type == 'out' && status == 'pending'
    ? span('.ts.badge.badge-primary.float-right', [ span('.icon.icon-spin1.animate-spin'), ' sending...' ])
    : span('.ts.badge.badge-secondary.float-right', { attrs: { title: tsStr } }, ago(ts))

  return li('.list-group-item', { class: { active: visible, 'list-group-item-action': !visible }, dataset: { feedToggle: fid } }, [
    div('.clearfix', [ leftBadge, rightBadge ])
  , !visible ? '' : ul('.list-unstyled.my-3', [
      status == 'pending' ? pendingStatus(obj) : ''
    , li([ strong(tsLabel), ' ', tsStr ])
    , status == 'failed' && msat ? li([ strong('Amount:'), ' ', unitf(msat) ]) : ''
    , type == 'in' && obj.amount_received_msat > obj.msatoshi ? li([ strong('Overpayment:'), ' ', unitf(obj.amount_received_msat-obj.msatoshi) ]) : ''
    , type == 'out' && status == 'complete' && obj.msatoshi ? li([ strong('Fee:'), ' ', feesText(obj, unitf) ]) : ''
    , obj.vendor ? li([ strong('Issuer:'), ' ', span('.break-word', obj.vendor) ]) : ''
    , showDesc(obj) ? li([ strong('Description:'), ' ', span('.break-word', obj.description) ]) : ''
    , obj.quantity ? li([ strong('Quantity:'), ' ', span('.break-word', obj.quantity) ]) : ''
    , obj.payer_note ? li([ strong('Payer note:'), ' ', span('.break-word', obj.payer_note) ]) : ''
    , type == 'out' && obj.destination ? li([ strong('Destination:'), ' ', small('.break-all', obj.destination) ]) : ''
    //, li([ strong('Payment hash:'), ' ', small('.break-all', obj.payment_hash) ])
    , offerId ? li([ strong('Offer ID:'), ' ', small('.break-all', offerId) ]) : ''
    , expert ? li(yaml(obj)) : ''
    ])
  ])
}

const feesText = ({ msatoshi: quoted, amount_sent_msat: sent }, unitf) =>
  `${unitf(sent-quoted)} (${((sent-quoted)/quoted*100).toFixed(2)}%)`

const pendingStatus = ({ attempts, number_of_parts }) => {
  if (!attempts) return li('Payment in progress...')

  const strategies = attempts.filter(a => !!a.strategy)
      , strategy = strategies.length && strategies[strategies.length-1].strategy

  return li(`${pluralize `${attempts.length} attempt`}${number_of_parts > 1 ? ` · ${number_of_parts} parts` : ''}${strategy ? ` · ${strategy}` : ''}`)
}

const paging = (total, start) => total <= perPage ? '' :
  div('.d-flex.justify-content-between.mt-2', [
    pageLink('newer', start > 0 ? start-perPage : null)
  , small('.align-self-center.text-muted', `showing ${+start+1} to ${Math.min(total, +start+perPage)} of ${total}`)
  , pageLink('older', start+perPage < total ? start+perPage : null)
  ])

const pageLink = (label, start) =>
  start == null ? button('.btn.btn-sm.btn-link.invisible', label)
                : button('.btn.btn-sm.btn-link', { dataset: { feedStart: ''+start } }, label)

const balanceOverview = ({ obalance, cbalance, channels, funds, unitf }) => {
  if (!obalance && !cbalance) return ''

  const colSize = obalance && cbalance ? 6 : 12
      , chanNum = channels.filter(c => c.chan.state == 'CHANNELD_NORMAL').length

  return div('.balance-overview.card.text-center.mb-3', div('.card-body.p-2',
    div('.row', [
      cbalance ? div(`.col-${colSize}`, div('.container', [
        a('.mb-0.font-weight-light.d-block', { attrs: { href: '#/channels' } }
        , [ unitf(cbalance, false, false), ' ', span('.text-muted', pluralize`in ${chanNum} channel`) ])
      ])) : ''
    , obalance ? div(`.col-${colSize}`, div('.container', [
        p('.mb-0.font-weight-light'
        , [ unitf(obalance, false, false), ' ', span('.text-muted', pluralize`in ${funds.outputs.length} output`) ])
      ])) : ''
    ])
  ))
}

module.exports = { home }
