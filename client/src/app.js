import run from '@cycle/rxjs-run'

import { Observable as O } from './rxjs'

import storageDriver       from '@cycle/storage'
import { makeDOMDriver }   from '@cycle/dom'
import { makeHTTPDriver }  from '@cycle/http'
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'

import makeSSEDriver   from './driver/sse'
import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'

import { dbg } from './util'

import intent from './intent'
import model  from './model'
import view   from './view'
import rpc from './rpc'


const navto = ({ incoming$: in$, outgoing$: out$, invoice$: inv$, saveConf$, payreq$ }) => O.merge(
  // navto '/' when receiving payments for the last invoice created by the user
  in$.withLatestFrom(inv$).filter(([ pay, inv ]) => pay.label === inv.label).mapTo('/')
  // navto '/' when sending payments
, out$.mapTo('/')
  // navto '/' when saving config
, saveConf$.mapTo('/')
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

  dbg(actions, 'flash:actions')
  dbg(resps, 'flash:rpc-resps')
  dbg({ state$ }, 'flash:state')
  dbg({ rpc$ }, 'flash:rpc-reqs')

  return {
    DOM:   vdom$
  , HTTP:  rpc.toHttp(rpc$, state$.map(S => S.conf.server))
  , route: navto$
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

, ...(process.env.BUILD_TARGET == 'cordova' ? {
    urihandler$: require('./driver/cordova-urihandler')
  , scan$: _ => O.empty()
  } : process.env.BUILD_TARGET == 'web' ? {
    urihandler$: _ => O.empty()
  , scan$: require('./driver/instascan')({ mirror: false, backgroundScan: false })
  } : {})
})
