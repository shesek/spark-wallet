import { Observable as O } from '../rxjs'

// HTML5 based system notifications for desktop and mobile (non-Cordova/Electron builds).
// this only works if we have an open tab. on mobile chrome, this also requires chrome
// to be active (but possibly on a different tab). real background notifications require
// using the Web Push API and routing notifications over Google's/Mozilla's servers,
// which is not implemented but might be in a future release.

if (!window.Notification || !navigator.serviceWorker) {
  module.exports = _ => O.empty()
} else {

  Notification.requestPermission()

  let worker
  navigator.serviceWorker.ready.then(reg => worker = reg)

  function display(msg) {
    if (worker && !document.hasFocus() && Notification.permission === 'granted')
      worker.showNotification('Spark', { body: msg, tag: 'spark-msg', icon: 'manifest/icon.png' })
  }

  module.exports = msg$ => (
    O.from(msg$).subscribe(display)
  , O.empty()
  )
}
