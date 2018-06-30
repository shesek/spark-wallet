import { div, h2, img, p } from '@cycle/dom'
import { yaml, qruri } from './util'

exports.nodeInfo = async ({ info, peers, conf: { expert } }) => {
  const uri = info.binding[0] && `${info.id}@${info.binding[0].address}:${info.binding[0].port}`
      , qr  = await qruri(uri || info.id)

  return div([
    div('.row', [
      div('.col-sm-6.text-center', [
        h2('.my-4', 'Node address')
      , p('.d-none.d-sm-block.text-muted.break-all.mt-3', uri)
      ])
    , div('.col-sm-6.text-center.text-sm-right', [
        img({ attrs: { src: qr } })
      , p('.d-block.d-sm-none.text-center.text-muted.break-all.mt-4', uri)
      ])
    ])
  , expert ? yaml({ info, peers }) : ''
  ])
}
