import run from '@cycle/rxjs-run'

import { Observable as O } from 'rxjs'

import storageDriver       from '@cycle/storage'
import { makeDOMDriver }   from '@cycle/dom'
import { makeHTTPDriver }  from '@cycle/http'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'

import makeScanDriver  from './driver/instascan'
import makeSSEDriver   from './driver/sse'
import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'

import { dbg } from './util'

import intent from './intent'
import model  from './model'
import view   from './view'
import rpc    from './rpc'

const _csrf = document.querySelector('meta[name=csrf]').content

const http = rpc$ => rpc$.map(([ method, opt={}, ...params ]) =>
    ({ category: opt.category || method, method: 'POST', url: './rpc', send: { _csrf, method, params }, state: opt.state }))

const main = ({ DOM, HTTP, SSE, route, conf$, scan$ }) => {
  const actions = intent({ DOM, route, scan$, conf$ })
      , state   = model({ HTTP, SSE, ...actions, savedConf$: conf$ })
      , rpc$    = rpc({ ...actions, ...state })

  dbg({ ...actions, ...state, rpc$ }, 'flash')

  return {
    DOM:   view({ ...actions, ...state })
  , HTTP:  http(rpc$)
  , route: state.goto$
  , conf$: state.state$.map(s => s.conf)
  , scan$: DOM.select('.scanqr').elements()
  }
}

run(main, {
  DOM:   makeDOMDriver('#app')
, HTTP:  makeHTTPDriver()
, SSE:   makeSSEDriver('./stream')
, route: makeRouteDriver(captureClicks(makeHashHistoryDriver()))
, conf$: makeConfDriver(storageDriver)
, scan$: makeScanDriver({ mirror: false, backgroundScan: false, /*scanPeriod: 5,*/ })
})


