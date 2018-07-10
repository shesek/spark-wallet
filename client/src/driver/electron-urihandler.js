import { ipcRenderer } from 'electron'
import { Observable as O } from '../rxjs'

// handle-uri events are dispatched to us by the main process
const urihandler$ = O.fromEvent(ipcRenderer, 'handle-uri', (e, uri) => uri)
  .windowTime(1000).switchMap(u$ => u$.distinctUntilChanged()) // ignore repetitions in 1s window
  .shareReplay(1)

module.exports = _ => urihandler$
