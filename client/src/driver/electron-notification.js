import { Observable as O } from '../rxjs'

function display(msg) {
  if (!document.hasFocus()) {
    const notif = new Notification('Spark', { body: msg, tag: 'spark-msg', icon: 'manifest/icon.png' })
    notif.onclick = _ => window.focus()
  }
}

module.exports = msg$ => (
  O.from(msg$).subscribe(display)
, O.empty()
)
