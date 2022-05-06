import { div, form, input, button, span, p, img, h2, h3, small, label } from '@cycle/dom'
import { formGroup } from './util'

const settings = ({ mode, serverInfo: { serverUrl, accessKey, lnPath, ipport, commandorune } }) =>
  form({ attrs: { do: 'save-settings' } }, [
    h2('Server Settings')

  // local connection mode is available on Electron builds only
  , process.env.BUILD_TARGET != 'electron' ? '' : formGroup('Connection Mode', div([
      div('.form-check', label('.form-check-label', { attrs: { for: 'mode-local' } }, [
        input('#mode-local.form-check-input', { attrs: { type: 'radio', name: 'mode', value: 'local' }, props: { checked: mode == 'local' } })
      , ' Connect to local c-lightning node'
      ]))
    , div('.form-check', label('.form-check-label', { attrs: { for: 'mode-remote' } }, [
        input('#mode-remote.form-check-input', { attrs: { type: 'radio', name: 'mode', value: 'remote' }, props: { checked: mode == 'remote' } })
      , ' Connect to remote Spark server'
      ]))
    , div('.form-check', label('.form-check-label', { attrs: { for: 'mode-websocket' } }, [
        input('#mode-websocket.form-check-input', { attrs: { type: 'radio', name: 'mode', value: 'websocket' }, props: { checked: mode == 'websocket' } })
      , ' Connect to remote Lightning Node through Websocket'
    ]))
    ]))

  , (mode == 'remote') || (mode == 'websocket') ? '' : formGroup('Path to c-lightning'
    , div('.input-group', [
        input('.form-control', {
          attrs: { type: 'text', name: 'lnPath', required: true, placeholder: '/home/user/.lightning' }
        , props: { value: lnPath || '' }
        })
      , div('.input-group-append', button('.btn.btn-secondary.enable-server', { attrs: { type: 'button' } }, 'Connect'))
      ])
    )

  , mode == 'websocket'? ''
  : formGroup('Server URL'
    , input('.form-control', {
        attrs: { type: 'url', name: 'serverUrl', required: true, placeholder: 'https://localhost:9737/' }
      , props: { value: serverUrl || '', disabled: mode == 'local' }
      })
    )

  , mode == 'websocket'? ''
  :formGroup('Access Key'
    , input('.form-control', {
        attrs: { type: 'text', name: 'accessKey', required: true, pattern: '[a-zA-Z0-9]+', placeholder: '(string of a-z, A-Z and 0-9)' }
      , props: { value: accessKey || '', disabled: mode == 'local' }
      })
    )
    
  , mode == 'websocket'? formGroup('LnLink'
      , input('.form-control', {
          attrs: { type: 'url', name: 'lnlink', required: true, placeholder: 'lnlink:nodeid@ip:port?token=rune' }
        , props: { value: ''}
        })
      )
    :''

  , div('.form-buttons', [
      button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save settings')
    , ' '
    , mode == 'remote' ? button('.btn.btn-lg.btn-secondary.scan-qr', 'Scan QR') : ''
    ])
  ])

const scan = div('.qr-scanner', [
  div('.indicator', [div('.bordertop'), div('.borderbottom')])
, div('.buttons-wrap.py-3.main-bg', button('.btn.btn-lg.btn-primary.stop-scan', 'Cancel'))
])

module.exports = { settings, scan }
