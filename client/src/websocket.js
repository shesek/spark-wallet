import urlutil from 'url'
import run from '@cycle/rxjs-run'
import serialize from 'form-serialize'
import { Observable as O } from './rxjs'
// import { makeDOMDriver } from '@cycle/dom'
import {form, button, textarea, a, span, strong, h2, ul, li, em, small, pre, code, div, input, p, makeDOMDriver, h} from '@cycle/dom';
import { makeHashHistoryDriver, captureClicks } from '@cycle/history'
import storageDriver from '@cycle/storage'
// Get cyclejs to use rxjs-compat-enabled streams
require("@cycle/run/lib/adapt").setAdapt(stream$ => O.from(stream$))

import makeRouteDriver from './driver/route'
import makeConfDriver  from './driver/conf'
import makeWebSocketDriver from './driver/web_socket'

import { combine, dbg } from './util'

import { layout } from './views/layout'
import { formGroup } from './views/util'

const main = ({DOM , sock}) => {
  const incoming$ = sock.map(r=>r.slice(8)).startWith('Please wait till the prompt..')
  , vdom$ = (str) => (form({ attrs: { do: 'exec-websoc' } }, [
    h2('RPC Console(Websocket)')
    ,formGroup('Websocket'
        ,input('.form-control', { attrs: { type: 'text', name: 'cmd', placeholder: 'e.g. invoice 10000 mylabel mydesc', required: true, autocapitalize: 'off' } 
      })
    )
    , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Execute')
    , div([p(str)])
    ])
  )
  , realdom$ = incoming$.map(res=>vdom$(res))
  , click$ = DOM.select('[do=exec-websoc]').events('submit',{ preventDefault: true })
              .map(e => ({ ...e.target.dataset, ...serialize(e.target, { hash: true }) }))

  , ldom$ = click$.map(r=>r.cmd)
  return {
    DOM: realdom$
  , sock: ldom$
  }
}

run(main, {
  DOM: makeDOMDriver('#app')
, sock: makeWebSocketDriver
})