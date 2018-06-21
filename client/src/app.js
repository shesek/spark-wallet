import run from '@cycle/rxjs-run'

import { Observable as O } from './rxjs'

import storageDriver       from '@cycle/storage'
import { makeDOMDriver }   from '@cycle/dom'
import { makeHTTPDriver }  from '@cycle/http'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'

import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'
import orientDriver    from './driver/screen-orient'

import { dbg } from './util'

import intent from './intent'
import model  from './model'
import view   from './view'
import rpc from './rpc'


const navto = ({ incoming$: in$, outgoing$: out$, invoice$: inv$, payreq$ }) => O.merge(
  // navto '/' when receiving payments for the last invoice created by the user
  in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label).mapTo('/')
  // navto '/' after sending payments
, out$.mapTo('/')
  // navto '/confirm' when viewing a payment request
, payreq$.mapTo('/confirm')
)

const main = ({ DOM, HTTP, SSE, route, conf$, scan$, urihandler$ }) => {

  const actions = intent({ DOM, route, conf$, scan$, urihandler$ })
      , resps   = rpc.parseRes({ HTTP, SSE })

      , state$  = model({ HTTP, ...actions, ...resps })

      , vdom$   = view({ state$, ...actions, ...resps })
      , rpc$    = rpc.makeReq(actions)
      , navto$  = navto({ ...resps, ...actions })
      , orient$ = actions.page$.map(p => p.pathname == '/scan' ? 'portrait' : 'unlock')


  dbg(actions, 'spark:actions')
  dbg({ state$ }, 'spark:state')
  dbg(resps, 'spark:rpc-res')
  dbg({ rpc$ }, 'spark:rpc-req')

  return {
    DOM:   vdom$
  , HTTP:  rpc.toHttp(rpc$)
  , route: navto$
  , conf$: state$.map(s => s.conf)
  , scan$: actions.scanner$
  , orient$: orient$
  }
}

run(main, {
  DOM:   makeDOMDriver('#app')
, HTTP:  makeHTTPDriver()
, route: makeRouteDriver(captureClicks(makeHashHistoryDriver()))

, conf$:   makeConfDriver(storageDriver)
, orient$: orientDriver

, ...(
  process.env.BUILD_TARGET == 'cordova' ? {
    urihandler$: require('./driver/cordova-urihandler')
  , scan$: require('./driver/cordova-qrscanner')
  , SSE: _ => _ => O.empty()
  }

: process.env.BUILD_TARGET == 'web' ? {
    urihandler$: _ => O.empty()
  , scan$: require('./driver/instascan')({ mirror: false, backgroundScan: false })
  , SSE: require('./driver/sse')('./stream')
  }

: {})
})
