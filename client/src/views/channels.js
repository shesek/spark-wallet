import { div, h2, ul, li, span, pre, strong, small, em, button, header } from '@cycle/dom'
import { yaml, omitKey } from './util'

const stateGroups = {
  active: [ 'CHANNELD_NORMAL' ]
, opening: [ 'CHANNELD_AWAITING_LOCKIN', 'OPENINGD' ]
, closing: [ 'CLOSINGD_SIGEXCHANGE', 'CHANNELD_SHUTTING_DOWN', 'ONCHAIN', 'AWAITING_UNILATERAL' ]
, closed: [ 'CLOSINGD_COMPLETE', 'FUNDING_SPEND_SEEN' ]
}

const groupStyle = { active: 'success', opening: 'info', closing: 'warning', closed: 'danger' }

// Get group for given state
const getGroup = state => Object.keys(stateGroups).find(group => stateGroups[group].includes(state))

// Get all channels as a list of (peer,channel) tuples
const getChannels = peers => [].concat(...peers.map(peer => peer.channels.map(chan => ({ peer, chan }))))

// Sort by status first, then by amount
const chanSorter = (a, b) => (chanSorting(b) - chanSorting(a)) || (b.chan.msatoshi_total - a.chan.msatoshi_total)

const chanSorting = ({ peer, chan }) =>
  peer.connected && chan.state == 'CHANNELD_NORMAL' ? 6
: peer.connected && stateGroups.opening.includes(chan.state) ? 5
: !peer.connected && chan.state == 'CHANNELD_NORMAL' ? 4
: stateGroups.closing.includes(chan.state) ? 3
: stateGroups.opening.includes(chan.state) ? 2
: stateGroups.closed.includes(chan.state) ? 1
: 0

export const channels = ({ peers, unitf, chanActive, conf: { expert } }) => {
  if (!peers) return '';

  const chans = getChannels(peers)
  chans.sort(chanSorter)

  return div([
    h2('.mb-3', [ 'Channels', ' ', button('.btn.btn-sm.btn-secondary.float-right', { attrs: { do: 'refresh-channels' } }, 'Reload') ])
  , ul('.list-group.channels', chans.map(channelRenderer({ unitf, expert, chanActive })))
  ])
}

const channelRenderer = ({ chanActive, unitf, expert }) => ({ chan, peer }) => {

  const bar = (label, color, msatoshi, amtText=unitf(msatoshi)) =>
    div(`.progress-bar.bg-${color}`, {
      attrs: { role: 'progressbar', title: `${label}: ${amtText}` }
    , style: { width: `${msatoshi / chan.msatoshi_total * 100}%` }
    }, msatoshi/chan.msatoshi_total > 0.05 ? amtText : '')

  const stateGroup = getGroup(chan.state)
      , stateLabel = !peer.connected && stateGroup == 'active' ? 'offline' : stateGroup
      , receivable = chan.msatoshi_total - chan.msatoshi_to_us - (chan.their_channel_reserve_satoshis*1000)

  const visible = chanActive == chan.channel_id
      , classes = { active: visible, 'list-group-item-action': !visible
                  , [`c-${stateGroup}`]: true, 'p-online': peer.connected, 'p-offline': !peer.connected }

  return li('.list-group-item', { class: classes, dataset: { chanToggle: chan.channel_id } }, [
    header('.d-flex.justify-content-between.mb-2', [
      span('.capacity', unitf(chan.msatoshi_total))
    , span('.state', stateLabel)
    ])

  , div('.progress.channel-bar', [
      bar('Our reserve', 'warning', chan.our_channel_reserve_satoshis * 1000)
    , bar('Spendable', 'success', chan.spendable_msatoshi)
    , bar('Receivable', 'info', receivable)
    , bar('Their reserve', 'warning', chan.their_channel_reserve_satoshis * 1000)
    ])

  , !visible ? '' : ul('.list-unstyled.my-3', [
      li([ strong('Channel ID:'), ' ', chan.short_channel_id || chan.channel_id ])
    , (!expert || !chan.short_channel_id) ? '' : li([ strong('Full Channel ID:'), ' ', small('.break-all', chan.channel_id) ])
    , li([ strong('Status:'), ' ', chan.state ])
    , li([ strong('Ours:'), ' ', unitf(chan.msatoshi_to_us) ])
    , li([ strong('Spendable:'), ' ', unitf(chan.spendable_msatoshi) ])
    , li([ strong('Receivable:'), ' ', unitf(receivable) ])
    , li([ strong('Node:'), ' ', small('.break-all', peer.id), ' ', em(`(${peer.connected ? 'connected' : 'disconnected'})`) ])
    , !expert ? '' : li([ strong('Funding TXID:'), ' ', small('.break-all', chan.funding_txid) ])
    , !expert ? '' : li('.status-text', chan.status.join('\n'))
    , !expert ? '' : li(yaml({ peer: omitKey('channels', peer), ...omitKey('status', chan) }))
    ])
  ])
}
