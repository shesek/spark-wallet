import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup } from './util'

const settings = ({ server }) =>
  form({ attrs: { do: 'save-settings' } }, [
    h2('Settings')
  , formGroup('Server URL'
    , div('.input-group.input-group-lg', [
        input('.form-control', { attrs: {
          type: 'url', name: 'server', value: server || '', placeholder: 'https://user:pwd@spark-server.com:9113/'
        , required: true } })
      , div('.input-group-append', a('.btn.btn-secondary', { attrs: { href: '#/scan' } }, 'Scan'))
      ])
    )

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save')
  , ' '
  , a('.btn.btn-lg.btn-secondary', { attrs: { href: '.' } }, 'Cancel')
  ])

const scan = div('.qr-scanner', [ div('.indicator', [div('.bordertop'), div('.borderbottom')]) ])

module.exports = { settings, scan }
