import { div, h2, ul, li, span, pre, strong, small, em, button, header, a, form, input, p, label } from '@cycle/dom'
import { yaml, omitKey, formGroup, amountField, getChannels, ago, fancyCheckbox } from './util'

const blockInterval = process.env.BLOCK_INTERVAL || 600

const stateGroups = {
  active: [ 'CHANNELD_NORMAL' ]
, opening: [ 'CHANNELD_AWAITING_LOCKIN', 'OPENINGD' ]
, closing: [ 'CLOSINGD_COMPLETE', 'CLOSINGD_SIGEXCHANGE', 'CHANNELD_SHUTTING_DOWN', 'AWAITING_UNILATERAL' ]
, closed: [ 'FUNDING_SPEND_SEEN', 'ONCHAIN' ]
}

// Get group for given state
const getGroup = state => Object.keys(stateGroups).find(group => stateGroups[group].includes(state))

// Sort by status first, then by amount
const chanSorter = (a, b) => (chanSorting(b) - chanSorting(a)) || (b.chan.total_msat - a.chan.total_msat)

const chanSorting = ({ peer, chan }) =>
  peer.connected && chan.state == 'CHANNELD_NORMAL' ? 6
: peer.connected && stateGroups.opening.includes(chan.state) ? 5
: !peer.connected && chan.state == 'CHANNELD_NORMAL' ? 4
: stateGroups.closing.includes(chan.state) ? 3
: stateGroups.opening.includes(chan.state) ? 2
: stateGroups.closed.includes(chan.state) ? 1
: 0

export const channels = ({ channels, chanActive, unitf, info, conf: { expert } }) => {
  if (!channels) return div('.loader.inline')

  const blockheight = info && info.blockheight

  channels = channels.slice()
  channels.sort(chanSorter)

  return div([
    h2('.mb-3', [ 'Channels'
    , ' ', button('.btn.btn-sm.btn-secondary.float-right', { attrs: { do: 'refresh-channels' } }, 'Reload')
    //, ' ', a('.btn.btn-sm.btn-primary.float-right.mr-1', { attrs: { href: '#/channels/new' } }, 'New')
    ])
  , channels.length
    ? ul('.list-group.channels', channels.map(channelRenderer({ unitf, expert, chanActive, blockheight })))
    : p('You have no channels.')
  , div('.text-center', a('.btn.btn-primary.mt-3', { attrs: { href: '#/channels/new' } }, 'Open channel'))
  ])
}

export const newChannel = ({ amtData, fundMaxChan, obalance, unitf, conf: { unit, expert } }) => {
  const availText = obalance != null ? `Available: ${unitf(obalance)}` : ''

  return form({ attrs: { do: 'open-channel' } }, [
    h2('Open channel')

  , formGroup('Node URI', input('.form-control.form-control-lg' , { attrs: {
      name: 'nodeuri', placeholder: 'nodeid@host[:port]', required: true } }))

  , formGroup('Channel funding', div([
      !fundMaxChan
        ? amountField(amtData, 'channel_capacity_msat', true, availText)
        : div('.input-group', [
            input({ attrs: { type: 'hidden', name: 'channel_capacity_msat', value: 'all' } })
          , input('.form-control.form-control-lg.disabled', { attrs: { disabled: true, placeholder: availText } })
          , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
          ])
    , fancyCheckbox('channel-fund-max', 'Fund maximum', fundMaxChan, '.btn-sm')
    ]))

  , expert ? formGroup('Fee rate', input('.form-control.form-control-lg'
             , { attrs: { type: 'text', name: 'feerate', placeholder: '(optional)'
                        , pattern: '[0-9]+(perk[bw])?|slow|normal|urgent' } })) : ''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Open channel')
    , ' '
    , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/channels' } }, 'Cancel')
    ])
  ])
}

const channelRenderer = ({ chanActive, unitf, expert, blockheight }) => ({ chan, peer }) => {

  const bar = (label, color, amount_msat, amtText=unitf(amount_msat)) =>
    div(`.progress-bar.bg-${color}`, {
      attrs: { role: 'progressbar', title: `${label}: ${amtText}` }
    , style: { width: `${amount_msat / chan.total_msat * 100}%` }
    }, amount_msat/chan.total_msat > 0.05 ? amtText : '')

  const stateGroup = getGroup(chan.state)
      , stateLabel = !peer.connected && stateGroup == 'active' ? 'offline' : stateGroup
      , isClosed   = [ 'closing', 'closed' ].includes(stateGroup)
      , ours       = chan.to_us_msat
      , theirs     = chan.total_msat - ours
      // the channel reserve fields appear to be sometimes (incorrectly?) missing,
      // defaulting them to 0 isn't quite right but should work for now
      , ourReserve = chan.our_channel_reserve_satoshis*1000 || 0
      , thrReserve = chan.their_channel_reserve_satoshis*1000 || 0
      , receivable = theirs - ourReserve
      , spendable  = ours - thrReserve

  const channelHeight = chan.short_channel_id && +chan.short_channel_id.split(/[:x]/)[0]
      , channelAge    = channelHeight && blockheight && (blockheight - channelHeight + 1)
      , channelAgeFuz = channelAge && ago(Date.now()/1000 - channelAge*blockInterval).replace(/ ago$/,'')

  const visible = chanActive == chan.channel_id
      , classes = { active: visible, 'list-group-item-action': !visible
                  , [`c-${stateGroup}`]: true, 'p-online': peer.connected, 'p-offline': !peer.connected }

  return li('.list-group-item', { class: classes, dataset: { chanToggle: chan.channel_id } }, [
    header('.d-flex.justify-content-between.mb-2', [
      span('.capacity', unitf(chan.total_msat))
    , span('.state', stateLabel)
    ])

  , div('.progress.channel-bar', !isClosed ? [
      ourReserve ? bar('Our reserve', 'warning', ourReserve) : ''
    , spendable  > 0 ? bar('Spendable', 'success', spendable) : ''
    , receivable > 0 ? bar('Receivable', 'info', receivable) : ''
    , thrReserve ? bar('Their reserve', 'warning', thrReserve) : ''
    ] : [
      ours   > 0 ? bar('Ours', 'success', ours) : ''
    , theirs > 0 ? bar('Theirs', 'info', theirs) : ''
    ])

  , !visible ? '' : ul('.list-unstyled.my-3', [
      li([ strong('Channel ID:'), ' ', chan.short_channel_id || small('.break-all', chan.channel_id) ])
    , (expert && chan.short_channel_id) ? li([ strong('Full Channel ID:'), ' ', small('.break-all', chan.channel_id) ]) : ''
    , li([ strong('Status:'), ' ', chan.state.replace(/_/g, ' ') ])

    , !isClosed ? li([ strong('Spendable:'), ' ', unitf(spendable) ]) : ''
    , !isClosed ? li([ strong('Receivable:'), ' ', unitf(receivable) ]) : ''

    , isClosed || expert ? li([ strong('Ours:'), ' ', unitf(ours) ]) : ''
    , isClosed || expert ? li([ strong('Theirs:'), ' ', unitf(theirs) ]) : ''

    , channelAge ? li([ strong('Age:'), ' ', `${channelAge} blocks (${channelAgeFuz})` ]) : ''
    , li([ strong('Peer:'), ' ', small('.break-all', peer.id), ' ', em(`(${peer.connected ? 'connected' : 'disconnected'})`) ])
    , expert ? li([ strong('Funding TXID:'), ' ', small('.break-all', chan.funding_txid) ]) : ''
    , expert ? li('.status-text', chan.status.join('\n')) : ''

    , !isClosed ? li('.text-center'
      , button('.btn.btn-link.btn-sm', { dataset: { closeChannel: chan.channel_id, closeChannelPeer: peer.id } }, 'Close channel')) : ''

    , expert ? li(yaml({ peer: omitKey('channels', peer), ...omitKey('status', chan) })) : ''
    ])
  ])
}
