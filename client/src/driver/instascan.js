import { Observable as O } from '../rxjs'

require('webrtc-adapter')

const Instascan$ = (window.Instascan ? O.of(Instascan)
: O.fromEvent(document, 'load', true)
   .filter(e => e.target.src && e.target.src.includes('lib/instascan.js'))
   .first()
   .map(_ => window.Instascan)
).share()

const Scanner$ = Instascan$.map(Instascan => Instascan.Scanner)
    , Camera$  = Instascan$.map(Instascan => Instascan.Camera)

const makeScanDriver = (opt={}) => {
  const video    = document.createElement('video')
      , scanner$ = Scanner$.map(Scanner => new Scanner({ ...opt, video })).shareReplay(1)
      , scan$    = scanner$.flatMap(scanner => O.fromEvent(scanner, 'scan')).share()
      , active$  = scanner$.flatMap(scanner => O.fromEvent(scanner, 'active')).share()

  video.className = 'qr-video'
  document.body.appendChild(video)

  function startScan(Camera, scanner) {
    Camera.getCameras().then(pickCam).then(cam => {
      document.body.classList.add('qr-scanning')
      scanner.start(cam)
    })
  }

  function stopScan(scanner) {
    document.body.classList.remove('qr-scanning')
    scanner.stop()
  }

  return _mode$ => {
    const mode$ = O.from(_mode$)

    // start/stop scanner according to mode$
    O.combineLatest(mode$, Camera$, scanner$).subscribe(([ mode, Camera, scanner  ]) =>
      mode ? startScan(Camera, scanner) : stopScan(scanner))

    // if the scanner becomes active while mode$ is off, turn it off again
    // without this, starting the scanner then quickly stopping it before it fully initialized could get it stuck on screen
    active$.withLatestFrom(mode$, scanner$)
      .subscribe(([ active, mode, scanner ]) => (!mode && setTimeout(_ => scanner.stop(), 100)))

    return scan$
  }
}

const pickCam = cams =>
  cams.find(cam => cam.name && cam.name.includes('back'))
  || cams[0]

module.exports = makeScanDriver
