import { Observable as O } from '../rxjs'
//import { Scanner, Camera } from 'instascan'

const { Scanner, Camera } = window.Instascan

require('webrtc-adapter')

const makeScanDriver = (opt={}) => {
  const video   = document.createElement('video')
      , scanner = new Scanner({ ...opt, video })
      , getCams = _ => getCams._cache || (getCams._cache = Camera.getCameras())

  return _els$ => {
    const els$ = O.from(_els$)

    // start scanning whenever a matching element appears in DOM
    els$.filter(x => !!x.length).map(x => x[0]).subscribe(el =>
      getCams().then(cams => {
        const camIdx = (+el.dataset.camIdx || 0) % cams.length
        if (video.parentNode != el || scanner._camIdx !== camIdx) {
          const cam = cams[camIdx]
          scanner._camIdx = camIdx
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

module.exports = makeScanDriver
