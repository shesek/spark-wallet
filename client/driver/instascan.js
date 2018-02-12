import { Observable as O } from 'rxjs'
import { Scanner, Camera } from 'instascan/src'

require('webrtc-adapter')

const makeScanDriver = (opt={}) => {
  const video   = document.createElement('video')
      , scanner = new Scanner({ ...opt, video })
      , getCams = _ => getCams._cache || (getCams._cache = Camera.getCameras())

  return _els$ => {
    const els$ = O.from(_els$)

    // start scanning whenever a matching element appears in DOM
    els$.filter(x => !!x.length).map(x => x[0]).subscribe(el => {
      if (video.parentNode != el) {
        el.appendChild(video)
        getCams().then(cams => console.log({cams,opt}) || scanner.start(cams[cams.length-1]))
      }
    })

    const scan$ = O.fromEvent(scanner, 'scan')

    // stop scanning whenever the DOM element disappears
    els$.filter(x => !x.length).subscribe(_ => scanner.stop())

    return scan$
  }
}

module.exports = makeScanDriver
