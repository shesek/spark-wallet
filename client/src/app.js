import run from '@cycle/rxjs-run'

import { Observable as O } from './rxjs'

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
import { rpcCalls, rpcIntent, rpc2http } from './rpc'


// jump to homepage when sending/receiving payments
const goto = ({ incoming$: in$, outgoing$: out$, invoice$: inv$ }) =>
  O.merge(out$, in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label))
    .mapTo('/')

const main = ({ DOM, HTTP, SSE, route, conf$, scan$ }) => {

  const actions = intent({ DOM, route, conf$, scan$ })
      , resps   = rpcIntent({ HTTP, SSE })

      , state$  = model({ HTTP, ...actions, ...resps })

      , vdom$   = view({ state$, ...actions, ...resps })
      , rpc$    = rpcCalls(actions)

  dbg(actions, 'flash:actions')
  dbg(resps, 'flash:rpc-resps')
  dbg({ state$ }, 'flash:state')
  dbg({ rpc$ }, 'flash:rpc-reqs')

  return {
    DOM:   vdom$
  , HTTP:  rpc2http(rpc$, state$.map(S => S.conf.server))
  , route: goto(resps)
  , conf$: state$.map(s => s.conf)
  , scan$: actions.scanner$
  }
}

run(main, {
  DOM:   makeDOMDriver('#app')
, HTTP:  makeHTTPDriver()
, SSE:   makeSSEDriver('./stream')
, route: makeRouteDriver(captureClicks(makeHashHistoryDriver()))
, conf$: makeConfDriver(storageDriver)
, scan$: makeScanDriver({ mirror: false, backgroundScan: false })
})
