import EventEmitter from 'events'
import { Observable as O } from '../rxjs'

const em    = new EventEmitter
    , scan$ = O.fromEvent(em, 'scan').share()

function handleScan(err, contents) {
  if (err && err.code == 6) em.emit('cancel')
  else if (err) em.emit('error', err)
  else em.emit('scan', contents)
}

function startScan() {
  document.body.classList.add('qr-scanning')
  QRScanner.scan(handleScan)
  QRScanner.show()
}

function stopScan() {
  document.body.classList.remove('qr-scanning')
  QRScanner.destroy()
}


// Receives a stream of scan start/stop requests,
// returns a stream of scanned QR texts
function scanDriver(_mode$) {
  O.from(_mode$)
    .filter(_ => !!window.QRScanner) // skip requests if QRScanner is not yet loaded
    .distinctUntilChanged()
    .subscribe(mode => mode ? startScan() : stopScan())

  // @todo destroy() QR scanner after some time of no activity

  return scan$
}

module.exports = scanDriver
