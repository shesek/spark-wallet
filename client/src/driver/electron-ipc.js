import { Observable as O } from '../rxjs'

const { ipcRenderer } = window

module.exports = cmd$ => (
  O.from(cmd$).subscribe(cmd => ipcRenderer.send(...cmd))
, topic => O.fromEvent(ipcRenderer, topic, (e, arg) => arg)
)
