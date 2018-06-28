import { Observable as O } from '../rxjs'

module.exports = url => {
  const es = new EventSource(url)
  return _ => (ev='message') => O.fromEvent(es, ev).map(r => r.data).map(JSON.parse)
}
