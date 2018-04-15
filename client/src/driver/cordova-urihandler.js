import EventEmitter from 'events'
import { Observable as O } from '../rxjs'

const em = new EventEmitter

window.handleOpenURL = url => em.emit('handle', url)

window.addEventListener('deviceready', _ =>
  window.plugins.launchmyapp.getLastIntent(url => em.emit('handle', url))
, false)

const urihandler$ = O.fromEvent(em, 'handle')
  .windowTime(1000).switchMap(u$ => u$.distinctUntilChanged()) // ignore repetitions in 1s window
  .shareReplay(1)

module.exports = _ => urihandler$
