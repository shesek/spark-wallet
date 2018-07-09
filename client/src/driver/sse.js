import url from 'url'
import { Observable as O } from '../rxjs'

module.exports = _ => {
  // provide access key as a query string arg when connecting to a remote server.
  // when using the local server, http basic auth or cookies are used instead,
  const srcUrl = process.env.BUILD_TARGET === 'web'
    ? './stream'
    : url.resolve(localStorage.serverUrl, `stream?access-key=${localStorage.serverAccessKey}`)

  const es = new EventSource(srcUrl)
  return _ => (ev='message') => O.fromEvent(es, ev).map(r => r.data).map(JSON.parse)
}
