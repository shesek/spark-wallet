import { Observable as O } from '../rxjs'
//import { Scanner, Camera } from 'instascan'

const { Scanner, Camera } = window.Instascan

require('webrtc-adapter')

const makeScanDriver = (opt={}) => {
  const video   = document.createElement('video')
      , scanner = new Scanner({ ...opt, video })
      , cam$ = O.fromPromise(Camera.getCameras()).map(pickCam).shareReplay(1)

  return _els$ => {
    const els$ = O.from(_els$)

    // start scanning whenever a matching element appears in the DOM
    els$.filter(x => !!x.length)
      .combineLatest(cam$, (els, cam) => [ els[0], cam ])
      .filter(([ el, cam ]) => !!cam)
      .subscribe(([ el, cam ]) => {
        if (video.parentNode != el) {
          el.appendChild(video)
          scanner.start(cam)
        }
      })

    const scan$ = O.fromEvent(scanner, 'scan')

    // stop scanning whenever a QR is scanned or when the DOM element disappears
    els$.filter(x => !x.length).merge(scan$).subscribe(_ => scanner.stop())

    return scan$
  }
}

const pickCam = cams =>
  cams.find(cam => cam.name && !!~cam.name.indexOf('back'))
  || cams[0]

module.exports = makeScanDriver
