import { Observable as O } from '../rxjs'

require('webrtc-adapter')

const Instascan$ = (window.Instascan ? O.of(Instascan)
: O.fromEvent(document, 'load', true)
   .filter(e => e.target.src && ~e.target.src.indexOf('lib/instascan.js'))
   .map(_ => window.Instascan)
)

const Scanner$ = Instascan$.map(Instascan => Instascan.Scanner)
    , Camera$  = Instascan$.map(Instascan => Instascan.Camera)

const makeScanDriver = (opt={}) => {
  const video    = document.createElement('video')
      , scanner$ = Scanner$.map(Scanner => new Scanner({ ...opt, video }))
      , scan$    = scanner$.flatMap(scanner => O.fromEvent(scanner, 'scan'))

  video.className = 'qr-video'
  document.body.appendChild(video)

  function startScan(Camera, scanner) {
    Camera.getCameras().then(pickCam).then(cam => {
      document.body.className += ' qr-scanning'
      scanner.start(cam)
    })
  }

  function stopScan(scanner) {
    document.body.className = document.body.className.replace(/\bqr-scanning\b/, '')
    scanner.stop()
  }

  return _mode$ => {
    O.combineLatest(_mode$, Camera$, scanner$).subscribe(([ mode, Camera, scanner  ]) =>
      mode ? startScan(Camera, scanner)
           : stopScan(scanner))
    return scan$
  }
}

const pickCam = cams =>
  cams.find(cam => cam.name && !!~cam.name.indexOf('back'))
  || cams[0]

module.exports = makeScanDriver
