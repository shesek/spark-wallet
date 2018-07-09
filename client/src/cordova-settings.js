import urlutil from 'url'
import run from '@cycle/rxjs-run'
import serialize from 'form-serialize'
import { Observable as O } from './rxjs'
import { makeDOMDriver } from '@cycle/dom'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'
import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'
import storageDriver from '@cycle/storage'

import { combine, dbg } from './util'

import { layout } from './views/layout'
import view from './views/cordova-settings'

// Settings manager for Cordova builds.
// This is a standalone cycle app loaded using a separate HTML file (settings.html).


const main = ({ DOM, storage, route, conf$, scan$ }) => {
  const
  // intent

    page$ = route()

  , doScan$ = DOM.select('.scan-qr').events('click')

  , save$ = DOM.select('form').events('submit', { preventDefault: true })
      .map(e => serialize(e.target, { hash: true }))

  , scanner$ = O.merge(doScan$.mapTo(true), scan$.mapTo(false)).startWith(false)

  // model
  , scanParse$ = scan$.map(parseQR)
  , scanValid$ = scanParse$.filter(x => !!x)

  , server$ = storage.local.getItem('serverUrl').merge(scanValid$.map(x => x.server))
  , acckey$ = storage.local.getItem('serverAccessKey').merge(scanValid$.map(x => x.acckey))

  , error$ = scanParse$.filter(x => !x).mapTo('Scanned QR is not a valid URL.')
      .merge(scanValid$.mapTo(null))
      .merge(DOM.select('[dismiss=alert]').events('click').mapTo(null))
      .startWith(null)

  , state$  = combine({ conf$, page$, server$, acckey$, error$, scanner$ })

  // sinks
  , body$    = state$.map(S => S.scanner ? view.scan : view.settings(S))
  , storage$ = save$.flatMap(d => O.of({ key: 'serverUrl', value: d.server }
                                     , { key: 'serverAccessKey', value: d.acckey }))

  dbg({ scan$, save$, server$, error$, state$, scanner$ })

  // redirect back to wallet after saving
  save$.subscribe(_ => location.href = 'index.html')

  return {
    DOM: combine({ state$, body$ }).map(layout)
  , storage: storage$
  , scan$: scanner$
  }
}

const keyMarker = '#access-key='

function parseQR(url) {
  const p = urlutil.parse(url)

  return (p && p.host)
  ? {
      server: p.hash ? url.substr(0, url.indexOf('#')) : url
    , acckey: p.hash && p.hash.startsWith(keyMarker) ? p.hash.substr(keyMarker.length) : null
    }
  : null
}

run(main, {
  DOM: makeDOMDriver('#app')
, storage: storageDriver
, route: makeRouteDriver(makeHashHistoryDriver())
, conf$: makeConfDriver(storageDriver)
, scan$: process.env.BUILD_TARGET === 'cordova'
  ? require('./driver/cordova-qrscanner')
  : require('./driver/instascan')({ mirror: false, backgroundScan: false })
})
