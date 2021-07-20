import { Observable as O } from './rxjs'
import serialize from 'form-serialize'
import { nanoid } from 'nanoid'
import { dbg, parseUri, parseRpcCmd } from './util'

module.exports = ({ DOM, route, conf$, scan$, urihandler$ }) => {
  const
    on     = (sel, ev, pd=false) => DOM.select(sel).events(ev, { preventDefault: pd })
  , click  = sel => on(sel, 'click')
  , submit = sel => on(sel, 'submit', true).map(e => ({ ...e.target.dataset, ...serialize(e.target, { hash: true }) }))

  // Page routes
  , page$   = route()
  , goHome$ = route('/')
  , goScan$ = route('/scan')
  , goSend$ = route('/payreq')
  , goRecv$ = route('/recv')
  , goNode$ = route('/node')
  , goLogs$ = route('/logs').merge(click('[do=refresh-logs]'))
  , goRpc$  = route('/rpc')

  , goChan$ = route('/channels')
  , goNewChan$ = route('/channels/new')
  , goDeposit$ = route('/deposit').mapTo('bech32')
      .merge(click('[data-newaddr-type]').map(e => e.ownerTarget.dataset.newaddrType))

  // Display and confirm payment requests (from QR, lightning: URIs and manual entry)
  , viewPay$ = O.merge(scan$, urihandler$).map(parseUri).filter(x => !!x)
                .merge(submit('[do=decode-pay]').map(r => r.paystr.trim()).map(paystr => parseUri(paystr) || paystr))
  , confPay$ = submit('[do=confirm-pay]')

  // RPC console actions
  , clrHist$ = click('[do=clear-console-history]')
  , execRpc$ = submit('[do=exec-rpc]').map(r => parseRpcCmd(r.cmd))
      .merge(click('[do=rpc-help]').mapTo([ 'help' ]))

  // New invoice actions
  , newInv$  = submit('[do=new-invoice]').map(r => ({
      label:       nanoid()
    , msatoshi:    r.msatoshi || 'any'
    , description: r.description || '⚡' }))

  // Payment amount field, shared for creating new invoices and for paying custom amounts
  , amtVal$ = on('[name=amount]', 'input').map(e => e.target.value)

  // Config page and toggle buttons
  , togTheme$ = click('.toggle-theme')
  , togUnit$  = click('.toggle-unit')
  , togExp$   = click('.toggle-exp')

  // Dismiss alert message
  , dismiss$ = O.merge(click('[data-dismiss=alert], a.navbar-brand, .content a, .content button')
                     , page$.filter(p => p.search != '?r'))

  // Payments feed page navigation and click-to-toggle
  , feedStart$ = click('[data-feed-start]').map(e => +e.ownerTarget.dataset.feedStart).startWith(0)
  , togFeed$ = click('ul.feed [data-feed-toggle]')
      .filter(e => e.target.closest('ul').classList.contains('feed')) // ignore clicks inside nested <ul>s
      .map(e => e.ownerTarget.dataset.feedToggle)

  // Channels management
  , updChan$ = click('[do=refresh-channels]')
  , togChan$ = click('ul.channels [data-chan-toggle]')
      .filter(e => e.target.closest('ul').classList.contains('channels')) // ignore clicks inside nested <ul>s
      .map(e => e.ownerTarget.dataset.chanToggle)
  , closeChan$ = click('[data-close-channel]')
      .map(e => e.ownerTarget.dataset).map(d => ({ chanid: d.closeChannel, peerid: d.closeChannelPeer }))
      .filter(_ => confirm('Are you sure you want to close this channel?'))
      .share()
  , openChan$ = submit('[do=open-channel]')
      .map(d => ({ ...d, channel_capacity_sat: toSatCapacity(d.channel_capacity_msat) }))
  , fundMaxChan$ = on('[name=channel-fund-max]', 'input')
      .map(e => e.target.checked)
      .merge(goNewChan$.mapTo(false))
      .startWith(false)

  // Offers
  , offerPay$ = submit('[do=offer-pay]')
  , offerRecv$ = submit('[do=offer-recv]').map(({ paystr }) => ({ paystr, label: nanoid() }))
  , offerPayQuantity$ = on('.offer-pay [name=quantity]', 'input').map(e => e.target.value)

  return { conf$, page$
         , goHome$, goScan$, goSend$, goRecv$, goNode$, goLogs$, goRpc$, goDeposit$
         , goChan$, goNewChan$
         , viewPay$, confPay$
         , offerPay$, offerRecv$, offerPayQuantity$
         , execRpc$, clrHist$
         , newInv$, amtVal$
         , togExp$, togTheme$, togUnit$
         , feedStart$, togFeed$
         , togChan$, updChan$, openChan$, closeChan$, fundMaxChan$
         , dismiss$
         }
}

const toSatCapacity = msat_capacity =>
  msat_capacity == 'all' ? 'all' : msat_capacity/1000|0
