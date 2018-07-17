import url from 'url'
import { Observable as O } from '../rxjs'

const serverInfo = process.env.BUILD_TARGET === 'web'
  ? { serverUrl: '.', accessKey: document.querySelector('[name=access-key]').content }
  : JSON.parse(localStorage.serverInfo)

module.exports = _ => {
  const srcUrl = url.resolve(serverInfo.serverUrl, `stream?access-key=${serverInfo.accessKey}`)

  const es = new EventSource(srcUrl)
  return _ => (ev='message') => O.fromEvent(es, ev).map(r => r.data).map(JSON.parse)
}
