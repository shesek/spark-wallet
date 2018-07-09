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
        type: 'url', name: 'server', value: server || '', placeholder: 'https://my.spark-server.com:9113/'
      , required: true } })
    )

  , formGroup('Access Key'
    , input('.form-control', { attrs: {
        type: 'text', name: 'acckey', value: acckey || '', pattern: '[a-zA-Z0-9]+'
      , required: true } })
    )

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save')
  , ' '
  , button('.btn.btn-lg.btn-info.scan-qr', 'Scan QR')
  , ' '
  , a('.btn.btn-lg.btn-secondary', { attrs: { href: 'index.html' } }, 'Cancel')
  ])

const scan = div('.qr-scanner', [ div('.indicator', [div('.bordertop'), div('.borderbottom')]) ])

module.exports = { settings, scan }
