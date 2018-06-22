import { Observable as O } from '../rxjs'

const { Scanner, Camera } = window.Instascan

require('webrtc-adapter')

const makeScanDriver = (opt={}) => {
  const video   = document.createElement('video')
      , scanner = new Scanner({ ...opt, video })
      , scan$   = O.fromEvent(scanner, 'scan')

  video.className = 'qr-video'
  document.body.appendChild(video)

  let _cam
  function startScan() {
    (_cam || (_cam = Camera.getCameras().then(pickCam))).then(cam => {
      document.body.className += ' qr-scanning'
      scanner.start(cam)
    })
  }

  function stopScan() {
    document.body.className = document.body.className.replace(/\bqr-scanning\b/, '')
    scanner.stop()
  }

  return _scanner$ => {
    const scanner$ = O.from(_scanner$)
    scanner$.filter(mode => !!mode).subscribe(startScan)
    scanner$.filter(mode => !mode).subscribe(stopScan)
    return scan$
  }
}

const pickCam = cams =>
  cams.find(cam => cam.name && !!~cam.name.indexOf('back'))
  || cams[0]

module.exports = makeScanDriver
