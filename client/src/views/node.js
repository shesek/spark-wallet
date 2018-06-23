import { div, h2, img, p } from '@cycle/dom'
import { yaml, qruri } from './util'

exports.nodeInfo = async ({ info, funds, peers, conf: { expert } }) => {
  if (!info) return div()

  const uri = info.binding[0] && `${info.id}@${info.binding[0].address}:${info.binding[0].port}`
      , qr  = await qruri(uri || info.id)

  return div('.text-center.text-sm-left', [
    h2('Node info')
  , img({ attrs: { src: qr } })
  , p('.text-muted.break-all.mt-3', uri || `${info.id} (address/port unavilable)`)
  , expert ? div('.text-left', yaml({ info, funds, peers })) : ''
  ])
}
