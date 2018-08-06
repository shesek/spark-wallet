import { div, form, button, input, h2, a, span, p, pre, code, ul, li } from '@cycle/dom'
import { yaml } from './util'

const rpc = ({ rpcHist }) => form({ attrs: { do: 'exec-rpc' } }, [
  h2('RPC Console')
, input('.form-control.d-block', { attrs: { type: 'text', name: 'cmd', placeholder: 'e.g. invoice 10000 mylabel mydesc', required: true, autocapitalize: 'off' } })
, button('.btn.btn-primary.mt-2', { attrs: { type: 'submit' } }, 'Execute')
, ' '
, button('.btn.btn-secondary.mt-2', { attrs: { type: 'button', do: 'clear-console-history' }}, 'Clear history')
, ' '
, button('.btn.btn-info.mt-2', { attrs: { type: 'button', do: 'rpc-help' }}, 'Help')
, !rpcHist.length ? '' : ul('.list-group.mt-4', rpcHist.map(r =>
    li('.list-group-item', [
      pre('.mb-0', [ '$ ', r.method, ' ', formatParams(r.params) ])
    , yaml(r.method == 'help' && r.res.help ? formatHelp(r.res) : r.res)
    ])))
])

const formatParams = params =>
  params.map(p => /\W/.test(p) ? `"${p.replace(/"/g, '\\"')}"` : p).join(' ')

const formatHelp = res =>
  res.help.map(({ command, description }) => `${ command }\n  ${ description }`).join('\n\n')

const logs = ({ log, created_at }) => div([
  h2([ 'Log entries ', button('.btn.btn-sm.btn-secondary', { attrs: { do: 'refresh-logs' } }, 'Refresh') ])
, pre('.logs.mt-3', code(log.map(i =>
    i.type === 'SKIPPED' ? `[SKIPPED] ${i.num_skipped}`
                         : `${i.time ? logTime(created_at, i.time) : ''} [${i.type}] ${i.source} ${i.log}`
  ).join('\n')))
])

const logTime = (logStart, time) => new Date((+logStart + +time) * 1000).toISOString()

module.exports = { rpc, logs }
