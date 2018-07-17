import { div, form, input, button, a, span, p, img, h2, h3, small, label } from '@cycle/dom'
import { formGroup } from './util'

const settings = ({ mode, serverInfo: { serverUrl, accessKey, lnPath }, error }) =>
  form({ attrs: { do: 'save-settings' } }, [
    h2('Settings')
  , error ? div('.alert.alert-dismissable.alert-danger',[
      button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
    , error
    ]) : ''

  // local connection mode is available on Electron builds only
  , process.env.BUILD_TARGET != 'electron' ? '' : formGroup('Mode', div([
      div('.form-check', [
        input('#mode-local.form-check-input', { attrs: { type: 'radio', name: 'mode', value: 'local' }, props: { checked: mode == 'local' } })
      , label('.form-check-label', { attrs: { for: 'mode-local' } }, 'Connect to local c-lightning node')
      ])
    , div('.form-check', [
        input('#mode-remote.form-check-input', { attrs: { type: 'radio', name: 'mode', value: 'remote' }, props: { checked: mode == 'remote' } })
      , label('.form-check-label', { attrs: { for: 'mode-remote' } }, 'Connect to remote Spark server')
      ])
    ]))

  , mode == 'remote' ? '' : formGroup('Path to c-lightning'
    , div('.input-group', [
        input('.form-control', {
          attrs: { type: 'text', name: 'lnPath', required: true, placeholder: '/home/user/.lightning' }
        , props: { value: lnPath || '' }
        })
      , div('.input-group-append', button('.btn.btn-secondary.enable-server', { attrs: { type: 'button' } }, 'Connect'))
      ])
    )

  , formGroup('Server URL'
    , input('.form-control', {
        attrs: { type: 'url', name: 'serverUrl', required: true, placeholder: 'https://localhost:9737/' }
      , props: { value: serverUrl || '', disabled: mode == 'local' }
      })
    )

  , formGroup('Access Key'
    , input('.form-control', {
        attrs: { type: 'text', name: 'accessKey', required: true, pattern: '[a-zA-Z0-9]+', placeholder: '(string of a-z, A-Z and 0-9)' }
      , props: { value: accessKey || '', disabled: mode == 'local' }
      })
    )

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save settings')
  , ' '
  , mode == 'remote' ? button('.btn.btn-lg.btn-secondary.scan-qr', 'Scan QR') : ''
  ])

const scan = div('.qr-scanner', [
  div('.indicator', [div('.bordertop'), div('.borderbottom')])
, div('.buttons-wrap.py-3.main-bg', button('.btn.btn-lg.btn-primary.stop-scan', 'Cancel'))
])

module.exports = { settings, scan }
