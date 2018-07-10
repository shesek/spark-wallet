import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup } from './util'

const settings = ({ server, acckey, error }) =>
  form({ attrs: { do: 'save-settings' } }, [
    h2('Settings')
  , error ? div('.alert.alert-dismissable.alert-danger',[
      button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
    , error
    ]) : ''

  , formGroup('Server URL'
    , input('.form-control', { attrs: {
        type: 'url', name: 'server', required: true, value: server || ''
      , placeholder: 'https://localhost:9737/'
      } })
    )

  , formGroup('Access Key'
    , input('.form-control', { attrs: {
        type: 'text', name: 'acckey', required: true, value: acckey || ''
      , pattern: '[a-zA-Z0-9]+', placeholder: '(string of a-z, A-Z and 0-9)'
      } })
    )

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save settings')
  , ' '
  , button('.btn.btn-lg.btn-secondary.scan-qr', 'Scan QR')
  ])

const scan = div('.qr-scanner', [
  div('.indicator', [div('.bordertop'), div('.borderbottom')])
, div('.buttons-wrap.py-3.main-bg', button('.btn.btn-lg.btn-primary.stop-scan', 'Cancel'))
])

module.exports = { settings, scan }
