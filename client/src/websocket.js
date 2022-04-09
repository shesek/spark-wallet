import '@babel/polyfill'
import 'webrtc-adapter'
import run from '@cycle/rxjs-run'

import storageDriver from '@cycle/storage'
import { makeDOMDriver } from '@cycle/dom'
import makeConfDriver  from './driver/conf'
import makeWebSocketDriver from './driver/web_socket'

import view from './views/websocket'
import { lyut } from './views/websocket'

import serialize from 'form-serialize'
import { Observable as O } from './rxjs'
import { combine } from './util'


// Get cyclejs to use rxjs-compat-enabled streams
require("@cycle/run/lib/adapt").setAdapt(stream$ => O.from(stream$))


const main = ({DOM, sock, conf$}) => {
  //Intent
  const click$ = DOM.select('[do=exec-websoc]').events('submit',{ preventDefault: true })
              .map(e => ({ ...e.target.dataset, ...serialize(e.target, { hash: true }) }))

  //Model
  ,incoming$ = sock.map(r=>r.slice(8)).startWith('{"Welcome": "Please wait for the prompt.."}')
  //Sinks
  ,ldom$ = click$.map(r=>r.cmd)
  ,mthd$ = click$.map(r=>r.cmd).startWith("Welcome!!")
  ,loading$ = O.merge(ldom$, incoming$).map(x => x[0] == '{' ? false : true).startWith(false)
  ,state$ = combine({ conf$, incoming$, loading$, mthd$})
  ,body$ = state$.map(S => view.websocket(S))
  

  return {
    DOM: combine({state$, body$}).map(lyut)
  , sock: ldom$
  }
}

run(main, {
  DOM: makeDOMDriver('#app')
, sock: makeWebSocketDriver
, conf$: makeConfDriver(storageDriver)
})
