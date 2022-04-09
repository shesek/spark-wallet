import {form, button, textarea, a, span, strong, h2, ul, li, em, small, pre, code, div, input, p, makeDOMDriver, h, nav} from '@cycle/dom';
import { formGroup, yaml } from '../views/util'


const lyut = ({ state: S, body }) =>
  div({ props: { className: `d-flex flex-column theme-${S.conf.theme}${S.loading?' loading':'' }` } }, [
  , console.log(S.loading)
  , navbar()
  , S.loading ? div('.loader.fixed') : ''
  , div('.content.container', body)
])

const navbar = () =>
  nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    div('.navbar-brand', [
      'Spark'
    ])
]))


const formatParams = params =>
  params.map(p => /\W/.test(p) ? `"${p.replace(/"/g, '\\"')}"` : p).join(' ')



const websocket = ( commhist ) => form({ attrs: { do: 'exec-websoc' } }, [
  h2('RPC Console(Websocket)')
  ,formGroup('Command:'
      ,input('.form-control', { attrs: { type: 'text', name: 'cmd', placeholder: 'e.g. invoice 10000 mylabel mydesc', required: true, autocapitalize: 'off' } 
    })
  )
  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit'} }, 'Execute')
  , ul('.list-group.mt-4', (
    li('.list-group-item', [
      pre('.mb-0', [ '$ ', commhist.mthd ? commhist.mthd: "Welcome!" ])
    , console.log("commhist.incoming here " + commhist.incoming)
    , yaml(JSON.parse(commhist.incoming))
    ])))
])


module.exports = { websocket, lyut }