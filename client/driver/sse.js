import { Observable as O } from 'rxjs'
import EventSource from 'eventsource'

module.exports = url => {
  const es = new EventSource(url)
  return _ => (ev='message') => O.fromEvent(es, ev)
}
