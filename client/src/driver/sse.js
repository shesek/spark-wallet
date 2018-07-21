import url from 'url'
import { Observable as O } from '../rxjs'

module.exports = serverInfo => {
  const srcUrl = url.resolve(serverInfo.serverUrl, `stream?access-key=${serverInfo.accessKey}`)

  const es = new EventSource(srcUrl)
  return _ => (ev='message') => O.fromEvent(es, ev).map(r => r.data).map(JSON.parse)
}
