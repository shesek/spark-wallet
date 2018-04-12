import { div, form, input, button, a, span, p, img, h2, h3, small } from '@cycle/dom'
import { formGroup, yaml, qruri } from './util'

const config = ({ conf: { server } }) =>
  form({ attrs: { do: 'save-config' } }, [
    h2('Settings')
  , formGroup('Server URL'
    , input('.form-control.form-control-lg', { attrs: {
        type: 'text', name: 'server', value: server || '', placeholder: 'https://my-nanopay-server.com/' } })
    )

  , button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Save')
  , ' '
  , a('.btn.btn-lg.btn-secondary', { attrs: { href: '#/' } }, 'Back')
  ])

module.exports = { config }
