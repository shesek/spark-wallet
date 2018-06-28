import { Observable as O } from '../rxjs'

module.exports = url => {
  // Only start SSE after the page loads, so that we don't get an infinite loading indicator spinner
  // https://bugs.chromium.org/p/chromium/issues/detail?id=95227
  // https://stackoverflow.com/questions/9932462/how-to-remove-safaris-loading-wheel-when-using-server-sent-events
  const es$ = O.fromEvent(window, 'load').first().map(_ => new EventSource(url)).shareReplay(1)

  return _ => (ev='message') => es$.switchMap(es => O.fromEvent(es, ev).map(r => r.data).map(JSON.parse))
}
