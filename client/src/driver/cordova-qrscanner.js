import EventEmitter from 'events'
import { Observable as O } from '../rxjs'

const em = new EventEmitter
function handleScan(err, contents) {
  if (err && err.code == 7) em.emit('cancel')
  else if (err) em.emit('error', err)
  else em.emit('scan', contents)
}

function transparency(mode) {
  document.body.className = mode ? `${document.body.className} transparent`
                                 : document.body.className.replace(/\btransparent\b/, '')
}

const scan$   = O.fromEvent(em, 'scan')
    , cancel$ = O.fromEvent(em, 'cancel')
    , error$  = O.fromEvent(em, 'error')

// Receives a stream of scan requests, returns a stream of scanned contents
function scanDriver (togscan$) {
  O.merge(togscan$, scan$.mapTo(false))
    .filter(_ => !!window.QRScanner)
    .subscribe(mode => mode
      ? (QRScanner.scan(handleScan), QRScanner.show(), transparency(true))
      : (QRScanner.cancelScan(), transparency(false)))

  return scan$
}

module.exports = scanDriver
