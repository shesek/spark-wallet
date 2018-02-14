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
import { rpcCalls, rpcResp } from './rpc'

const isObj = x => ({}).toString.call(x) == '[object Object]'

const _csrf = document.querySelector('meta[name=csrf]').content

const http = rpc$ => rpc$.map(([ method, params=[], ctx={} ]) =>
    ({ category: ctx.category || method, method: 'POST', url: './rpc', send: { _csrf, method, params }, ctx }))

const main = ({ DOM, HTTP, SSE, route, conf$, scan$ }) => {

  const actions = intent({ DOM, route, conf$, scan$ })
      , resps   = rpcResp({ HTTP, SSE })
      , state$  = model({ HTTP, ...actions, ...resps })

      , rpc$    = rpcCalls(actions)

      , currPaid$ = resps.incoming$.withLatestFrom(resps.invoice$).filter(([ pay, inv ]) => pay.label === inv.label)
      , goto$     = O.merge(currPaid$, resps.outgoing$).mapTo('/')

  dbg(actions, 'flash:actions')
  dbg(resps, 'flash:rpc-resps')
  dbg({ state$ }, 'flash:state')
  dbg({ rpc$ }, 'flash:rpc-reqs')

  return {
    DOM:   view(state$, { ...actions, ...resps })
  , HTTP:  http(rpc$)
  , route: goto$
  , conf$: state$.map(s => s.conf)
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


