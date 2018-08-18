import 'babel-polyfill'
import 'webrtc-adapter'
import 'pwacompat'

import run from '@cycle/rxjs-run'

import storageDriver      from '@cycle/storage'
import { makeDOMDriver }  from '@cycle/dom'
import { makeHTTPDriver } from '@cycle/http'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'

import makeSSEDriver   from './driver/sse'
import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'
import orientDriver    from './driver/screen-orient'

import { Observable as O } from './rxjs'
import { dbg } from './util'

import intent from './intent'
import model  from './model'
import view   from './view'
import rpc    from './rpc'

// Send Cordova/Electron users directly to server settings if there are none
if (process.env.BUILD_TARGET !== 'web' && !localStorage.serverInfo) {
  location.href = 'settings.html' // @xxx side-effects outside of drivers
  throw new Error('Missing server settings, redirecting')
}

const serverInfo = process.env.BUILD_TARGET === 'web'
  ? { serverUrl: '.', accessKey: document.querySelector('[name=access-key]').content }
  : JSON.parse(localStorage.serverInfo)

const main = ({ DOM, HTTP, SSE, route, conf$, scan$, urihandler$ }) => {

  const actions = intent({ DOM, route, conf$, scan$, urihandler$ })
      , resps   = rpc.parseRes({ HTTP, SSE })

      , state$  = model({ HTTP, ...actions, ...resps })

      , rpc$     = rpc.makeReq(actions)
      , vdom$    = view.vdom({ state$, ...actions, ...resps })
      , navto$   = view.navto({ ...resps, ...actions })
      , notif$   = view.notif({ state$, ...resps })
      , orient$  = view.orient(actions.page$)
      , scanner$ = view.scanner(actions)

  dbg({ conf$, scan$, urihandler$ }, 'spark:source')
  dbg(actions, 'spark:intent')
  dbg(resps, 'spark:rpc')
  dbg({ state$ }, 'spark:model')
  dbg({ rpc$, vdom$, navto$, notif$, orient$, scanner$ }, 'spark:sinks')

  return {
    DOM:   vdom$
  , HTTP:  rpc.toHttp(serverInfo, rpc$)
  , route: navto$
  , conf$: state$.map(s => s.conf)
  , scan$: scanner$
  , orient$
  , notif$
  }
}

run(main, {
  DOM:   makeDOMDriver('#app')
, SSE:   makeSSEDriver(serverInfo)
, HTTP:  makeHTTPDriver()
, route: makeRouteDriver(captureClicks(makeHashHistoryDriver()))

, conf$:   makeConfDriver(storageDriver)
, orient$: orientDriver

, ...(
  process.env.BUILD_TARGET == 'cordova' ? {
    urihandler$: require('./driver/cordova-urihandler')
  , scan$: require('./driver/cordova-qrscanner')
  , notif$: require('./driver/cordova-notification')
  }

: process.env.BUILD_TARGET == 'electron' ? {
    urihandler$: require('./driver/electron-urihandler')
  , scan$: require('./driver/instascan')({ mirror: false, backgroundScan: false })
  , notif$: require('./driver/electron-notification')
  }

: process.env.BUILD_TARGET == 'web' ? {
    urihandler$: _ => O.empty()
  , scan$: require('./driver/instascan')({ mirror: false, backgroundScan: false })
  , notif$: require('./driver/web-notification')
  }

: {})
})

if (process.env.BUILD_TARGET == 'web' && navigator.serviceWorker)
  window.addEventListener('load', _ => navigator.serviceWorker.register('worker.js'))

