import { div, form, button, input, h2, a, span, p, pre, code } from '@cycle/dom'
import { yaml } from './util'

const rpc = ({ rpcHist }) => form({ attrs: { do: 'exec-rpc' } }, [
  h2('RPC Console')
, input('.form-control.d-block', { attrs: { type: 'text', name: 'cmd', placeholder: 'e.g. invoice 10000 mylabel mydesc', required: true } })
, button('.btn.btn-primary.mt-2', { attrs: { type: 'submit' } }, 'Execute')
, ' '
, button('.btn.btn-secondary.mt-2', { attrs: { type: 'button', do: 'clear-console-history' }}, 'Clear history')
, ' '
, button('.btn.btn-info.mt-2', { attrs: { type: 'button', do: 'rpc-help' }}, 'Help')
, !rpcHist.length ? '' : ul('.list-group.mt-4', rpcHist.map(r =>
    li('.list-group-item', [ pre('.mb-0', [ '$ ', r.method, ' ', r.params.join(' ') ]), yaml(r.res) ])))
])

const logs = items => div([
  h2([ 'Log entries ', button('.btn.btn-sm.btn-secondary', { attrs: { do: 'refresh-logs' } }, 'Refresh') ])
, pre('.logs.mt-3', code(items.map(i =>
    i.type === 'SKIPPED' ? `[SKIPPED] ${i.num_skipped}`
                         : `${i.time} [${i.type}] ${i.source} ${i.log}`
  ).join('\n')))
])


module.exports = { rpc, logs }
