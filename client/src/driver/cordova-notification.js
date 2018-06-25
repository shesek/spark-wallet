import { Observable as O } from '../rxjs'

let plugin, enabled=false, isActive=true

document.addEventListener('deviceready', _ => {
  plugin = cordova.plugins.notification.local

  plugin.hasPermission(granted =>
    enabled = granted || plugin.registerPermission(granted => enabled = granted))

  document.addEventListener('pause',  _ => isActive = false, false)
  document.addEventListener('resume', _ => isActive = true, false)

}, false)

function display(msg) {
  if (enabled && !isActive)
    plugin.schedule({ title: 'Spark', text: msg, foreground: true, vibrate: true })
}

module.exports = msg$ => (
  O.from(msg$).subscribe(display)
, O.empty()
)
