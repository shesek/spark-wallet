import run from '@cycle/rxjs-run'

import { Observable as O } from 'rxjs'
import { makeDOMDriver }   from '@cycle/dom'
import { makeHTTPDriver }  from '@cycle/http'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'

import makeScanDriver  from './driver/instascan'
import makeSSEDriver   from './driver/sse'
import makeRouteDriver from './driver/route'

import { dbg } from './util'

import intent from './intent'
import model  from './model'
import view   from './view'
import rpc    from './rpc'

const _csrf = document.querySelector('meta[name=csrf]').content

const http = rpc$ => rpc$.map(([ method, state, ...params ]) =>
  ({ category: method, method: 'POST', url: 'rpc', send: { _csrf, method, params }, state }))

const main = ({ DOM, HTTP, SSE, route, scan$ }) => {
  const actions = intent({ DOM, route, scan$ })
      , state   = model({ HTTP, SSE, ...actions })
      , rpc$    = rpc(actions)

  dbg({ ...actions, ...state, rpc$ }, 'flash')

  return {
    DOM:   view({ ...actions, ...state })
  , HTTP:  http(rpc$)
  , route: state.goto$
  , scan$: DOM.select('.scanqr').elements()
  }
}

run(main, {
  DOM:   makeDOMDriver('#app')
, HTTP:  makeHTTPDriver()
, SSE:   makeSSEDriver('stream')
, scan$: makeScanDriver({ mirror: false, backgroundScan: false, cameraIndex: 0 })
, route: makeRouteDriver(captureClicks(makeHashHistoryDriver()))
})


