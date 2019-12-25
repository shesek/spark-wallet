import { Observable as O } from '../rxjs'

// check for WebRTC camera support
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

  // load instascan.js on demand, only if needed
  const script = document.createElement('script')
  script.src = 'lib/instascan.js'
  document.body.appendChild(script)

  const Instascan$ = O.fromEvent(script, 'load').map(_ => window.Instascan).share()
      , Scanner$   = Instascan$.map(Instascan => Instascan.Scanner)
      , Camera$    = Instascan$.map(Instascan => Instascan.Camera)

  const makeScanDriver = (opt={}) => {
    const video    = document.createElement('video')
        , scanner$ = Scanner$.map(Scanner => new Scanner({ ...opt, video })).shareReplay(1)
        , active$  = scanner$.flatMap(scanner => O.fromEvent(scanner, 'active')).share()
        , scan$    = scanner$.flatMap(scanner => O.fromEvent(scanner, 'scan'))
                             .map(x => Array.isArray(x) ? x[0] : x)
                             .share()

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
}

else {
  // if we don't have WebTC camera support, return a driver that
  // redirects the user to /payreq for manually pasting the bolt11 string
  module.exports = _ => _mode$ => (
    O.from(_mode$).subscribe(mode => mode && (location.hash = '/payreq'))
  , O.empty()
  )
}
