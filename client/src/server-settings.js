import urlutil from 'url'
import run from '@cycle/rxjs-run'
import serialize from 'form-serialize'
import { Observable as O } from './rxjs'
import { makeDOMDriver } from '@cycle/dom'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'
import storageDriver from '@cycle/storage'

// Get cyclejs to use rxjs-compat-enabled streams
require("@cycle/run/lib/adapt").setAdapt(stream$ => O.from(stream$))

import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'

import { combine, dbg } from './util'

import { layout } from './views/layout'
import view from './views/server-settings'

// Settings manager for Cordova/Electron builds.
// This is a standalone cycle app loaded using a separate HTML file (settings.html).

const main = ({ DOM, IPC, storage, route, conf$, scan$ }) => {
  const
    on = (sel, ev, pd=false) => DOM.select(sel).events(ev, { preventDefault: pd })

  // intent

  , page$ = route()

  , doScan$ = on('.scan-qr', 'click').mapTo(true)
  , stopScan$ = on('.stop-scan', 'click').mapTo(false)

  , save$ = on('form', 'submit', true).map(e => serialize(e.target, { hash: true, disabled: true }))
      .filter(d => (d.serverUrl && d.accessKey))

  , websocc$ = on('form', 'submit', true).map(e => serialize(e.target, { hash: true, disabled: true }))
      .filter(d => (d.lnlink))

  , scanner$ = O.merge(doScan$, stopScan$, scan$.mapTo(false)).startWith(false)

  // model
  , scanParse$ = scan$.map(parseQR)
  , scanValid$ = scanParse$.filter(x => !!x)

  , serverInfo$ = O.merge(
      storage.local.getItem('serverInfo').first().filter(x => !!x).map(JSON.parse)
    , IPC('serverInfo') // embedded electron spark server
    , scanValid$
    ).startWith({})

  , mode$ = process.env.BUILD_TARGET == 'electron' ? O.merge(
      serverInfo$.map(s => (!s.serverUrl || s.lnPath) ? 'local' : 'remote')
    , on('[name=mode]', 'input').map(e => e.target.value)
    ).distinctUntilChanged() : O.of('remote') // non-electron builds are always remote

  , error$ = O.merge(
      scanParse$.filter(x => !x).mapTo('Scanned QR is not a valid URL.')
    , IPC('serverError')
    )

  , alert$ = O.merge(
      error$.map(err => [ 'danger', err ])
    , IPC('serverInfo').map(info => [ 'success', 'Connection to c-lightning established' ])
    , on('[dismiss=alert]', 'click').mapTo(null)
    ).startWith(null)

  , state$ = combine({ conf$, page$, mode$, serverInfo$, alert$, scanner$ })

  // sinks
  , body$    = state$.map(S => S.scanner ? view.scan : view.settings(S))
  , storage$ = save$.map(d => ({ key: 'serverInfo', value: JSON.stringify(d) }))
  , web$ = websocc$.map(d => ({ key: 'websocketinfo', value: JSON.stringify(d) }))
  , store$ = O.merge(web$, storage$)
  , ipc$ = process.env.BUILD_TARGET == 'electron' ? O.merge(
      on('.enable-server', 'click').map(e => [ 'enableServer', e.target.closest('form').querySelector('[name=lnPath]').value ])
    , mode$.filter(mode => mode == 'remote').mapTo([ 'disableServer' ])
    ) : O.empty()

  dbg({ scan$, save$, websocc$, serverInfo$, error$, alert$, state$, scanner$, ipc$ })

  // redirect back to wallet after saving
  save$.subscribe(_ => location.href = 'index.html')
  websocc$.subscribe(_=> location.href = 'websocket.html')

  return {
    DOM: combine({ state$, body$ }).map(layout)
  , IPC: ipc$
  , storage: store$
  , scan$: scanner$
  }
}

const keyMarker = '?access-key='

function parseQR(url) {
  const p = urlutil.parse(url)

  return (p && p.host)
  ? { serverUrl: p.search ? url.substr(0, url.indexOf('?')) : url
    , accessKey: p.search && p.search.startsWith(keyMarker) ? p.search.substr(keyMarker.length) : null }
  : null
}

run(main, {
  DOM: makeDOMDriver('#app')
, IPC: process.env.BUILD_TARGET === 'electron'
  ? require('./driver/electron-ipc')
  : _ => _ => O.of() // noop driver
, storage: storageDriver
, route: makeRouteDriver(makeHashHistoryDriver())
, conf$: makeConfDriver(storageDriver)
, scan$: process.env.BUILD_TARGET === 'cordova'
  ? require('./driver/cordova-qrscanner')
  : require('./driver/instascan')({ mirror: false, backgroundScan: false })
})
