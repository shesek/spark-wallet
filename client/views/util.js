import YAML from 'js-yaml'
import qrcode from 'qrcode'
import vagueTime from 'vague-time'
import { pre, div, label, small } from '@cycle/dom'

const yaml = data => pre('.mt-3.text-left.text-muted', YAML.safeDump(data))
const qruri = inv => qrcode.toDataURL(`lightning:${ inv.bolt11  }`.toUpperCase()/*, { margin: 0, width: 300 }*/)
const ago = ts => vagueTime.get({ to: Math.min(ts*1000, Date.now()) })

const formGroup = (labelText, control, help) => div('.form-group', [
  label('.col-form-label.col-form-label-lg', labelText)
, control
, help ? small('.form-text.text-muted', help) : ''
])

module.exports = { yaml, qruri, ago, formGroup }
