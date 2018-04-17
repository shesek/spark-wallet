import EventEmitter from 'events'
import { Observable as O } from '../rxjs'

const em    = new EventEmitter
    , scan$ = O.fromEvent(em, 'scan')
    //, cancel$ = O.fromEvent(em, 'cancel')
    //, error$ = O.fromEvent(em, 'error')

function handleScan(err, contents) {
  if (err && err.code == 7) em.emit('cancel')
  else if (err) em.emit('error', err)
  else em.emit('scan', contents)
}

function startScan() {
  document.body.className += ' qr-scanning'
  QRScanner.scan(handleScan)
  QRScanner.show()
}

function stopScan() {
  document.body.className = document.body.className.replace(/\bqr-scanning\b/, '')
  QRScanner.cancelScan()
}


// Receives a stream of scan start/stop requests,
// returns a stream of scanned QR texts
function scanDriver(_scanner$) {
  O.from(_scanner$)
    .filter(_ => !!window.QRScanner) // skip requests if QRScanner is not yet loaded
    .subscribe(mode => mode ? startScan() : stopScan())

  return scan$
}

module.exports = scanDriver
