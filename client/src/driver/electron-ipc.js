import { Observable as O } from '../rxjs'

const { ipcRenderer } = window

ipcRenderer.on('serverError', err => console.error('Spark server error:', err))

module.exports = cmd$ => (
  O.from(cmd$).subscribe(cmd => ipcRenderer.send(...cmd))
, topic => O.fromEvent(ipcRenderer, topic, (e, arg) => arg).share()
)
