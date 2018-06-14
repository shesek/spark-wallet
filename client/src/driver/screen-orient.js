import { Observable as O } from '../rxjs'

module.exports = _orient$ => {

  O.from(_orient$).distinctUntilChanged().subscribe(orient => {
    const screenOrient = window.screen && screen.orientation
    if (!screenOrient || !screenOrient.lock) return;

    orient == 'unlock' ? screenOrient.unlock()
                       : screenOrient.lock(orient).catch(_ => null)
  })

  return O.empty()
}
