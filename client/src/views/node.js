import { div, h2, img, p, a } from '@cycle/dom'
import { yaml, qruri } from './util'

exports.nodeInfo = async ({ info, peers, conf: { expert } }) => {
  if (!info) return '';

  const uri = info.address[0] ? `${info.id}@${info.address[0].address}:${info.address[0].port}` : info.id
      , qr  = await qruri(uri)

  return div([
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('.mt-4.mb-0', 'Node address')
      , p('.d-none.d-sm-block.text-muted.break-all.mt-3', uri)
      ])
    , div('.col-sm-6.text-center', [
        img('.mt-3', { attrs: { src: qr } })
      , p('.d-block.d-sm-none.text-center.text-muted.break-all.mt-4', uri)
      ])
    ])
  , !info.address[0] ? p('.text-muted.small.text-center.mt-2', 'This node does not accept incoming connections.') : ''
  , process.env.BUILD_TARGET != 'web' ? p('.text-center.mt-4', a('.btn.btn-secondary.btn-sm', { attrs: { href: 'settings.html', rel: 'external' }}, 'Server settings')) : ''
  , expert ? yaml({ info, peers }) : ''
  ])
}
