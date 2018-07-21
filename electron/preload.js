const { ipcRenderer } = require('electron')

const listens = [ 'handle-uri', 'serverInfo', 'serverError' ]
    , emits   = [ 'enableServer', 'disableServer' ]

// expose the minimally required apis to the renderer process.
// h/t lightning-app https://youtu.be/VA8hlBDoHV8?t=39m25s

window.ipcRenderer = {
  send: (ev, data) => emits.includes(ev) && ipcRenderer.send(ev, data)
, addListener: (ev, cb) => listens.includes(ev) && ipcRenderer.addListener(ev, cb)
, removeListener: (ev, cb) => listens.includes(ev) && ipcRenderer.removeListener(ev, cb)
}
