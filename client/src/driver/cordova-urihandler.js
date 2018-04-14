import EventEmitter from 'events'
import { Observable as O } from '../rxjs'

const em = new EventEmitter

em.on('handle', url => console.log('handle', url))

window.handleOpenURL = url => { console.log('handle url', url);  em.emit('handle', url) }

window.addEventListener('deviceready', _ =>
  window.plugins.launchmyapp.getLastIntent(url => { console.log('get last', url); em.emit('handle', url) })
, false)

const urihandler$ = O.fromEvent(em, 'handle').shareReplay(1)

module.exports = _ => urihandler$
