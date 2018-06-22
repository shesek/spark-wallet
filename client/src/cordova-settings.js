import run from '@cycle/rxjs-run'
import serialize from 'form-serialize'
import { Observable as O } from './rxjs'
import { makeDOMDriver } from '@cycle/dom'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'
import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'
import storageDriver from '@cycle/storage'
import scanDriver from './driver/cordova-qrscanner'

import { combine, dbg } from './util'

import { layout } from './views/layout'
import view from './views/cordova-settings'

// Settings manager for Cordova builds.
// This currently includes a single setting: the server URL, including authentication data.
// This is a standalone cycle app loaded using a separate HTML file (settings.html).

const main = ({ DOM, storage, route, conf$, scan$ }) => {
  const
  // intent
    page$ = route()

  , save$ = DOM.select('form').events('submit', { preventDefault: true })
      .map(e => serialize(e.target, { hash: true }))

  , scanner$ = page$.map(p => p.pathname === '/scan').merge(scan$.mapTo(false))

  // model
  , server$ = storage.local.getItem('serverUrl').merge(scan$).startWith(null)
  , state$  = combine({ conf$, page$, server$, scanner$ })

  // sinks
  , body$    = state$.map(S => S.scanner ? view.scan : view.settings(S))
  , storage$ = save$.map(d => ({ key: 'serverUrl', value: d.server }))

  // @TODO check URL validty
  dbg({ scan$, save$, server$, state$, scanner$ })

  // redirect back to wallet after saving
  save$.subscribe(_ => location.href = 'index.html')

  return {
    DOM: combine({ state$, body$ }).map(layout)
  , storage: storage$
  , scan$: scanner$
  }
}

run(main, {
  DOM: makeDOMDriver('#app')
, storage: storageDriver
, route: makeRouteDriver(makeHashHistoryDriver())
, conf$: makeConfDriver(storageDriver)
, scan$: scanDriver
})
