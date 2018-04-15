import { Observable as O } from '../rxjs'
//import { Scanner, Camera } from 'instascan'

const { Scanner, Camera } = window.Instascan

require('webrtc-adapter')

const makeScanDriver = (opt={}) => {
  const video   = document.createElement('video')
      , scanner = new Scanner({ ...opt, video })
      , getCam = _ => getCam._cache || (getCam._cache = Camera.getCameras().then(pickCam))

  return _els$ => {
    const els$ = O.from(_els$)

    // start scanning whenever a matching element appears in DOM
    els$.filter(x => !!x.length).map(x => x[0]).subscribe(el =>
      getCam().then(cam => {
        if (video.parentNode != el) {
          el.appendChild(video)
          scanner.start(cam)
        }
      })
    )

    const scan$ = O.fromEvent(scanner, 'scan')

    // stop scanning whenever a QR is scanned or when the DOM element disappears
    els$.filter(x => !x.length).merge(scan$).subscribe(_ => scanner.stop())

    return scan$
  }
}

const pickCam = cams =>
  cams.find(cam => !!~cam.name.indexOf('back')) || cams[0]

module.exports = makeScanDriver
