const { app, ipcMain } = require('electron')
    , { fork } = require('child_process')
    , nanoid = require('nanoid')
    , Store = require('electron-store')
    , path = require('path')

const store = new Store({ name: 'spark-server' })

let accessKey = store.get('accessKey')
accessKey || store.set('accessKey', accessKey = nanoid(30))

let proc

function startServer(lnPath) {
  console.log('Starting embedded Spark server for ' + lnPath)

  proc && proc.kill()

  proc = fork(require.resolve('./server.bundle.js'), {
    env: {
      PORT: 0 // any available port
    , LN_PATH: lnPath
    , ACCESS_KEY: accessKey
    , NO_TLS: 1
    , NO_WEBUI: 1
    }
  })

  proc.on('error', err => console.error('Spark server error', err.stack || err))
  proc.on('message', m => console.error('Spark server msg', m))
  proc.on('close', _ => proc = null)

  return new Promise((resolve, reject) =>
    proc.once('message', m => m.serverUrl ? resolve(m.serverUrl) : reject(new Error('invalid message')))
  ).then(serverUrl => ({ serverUrl, accessKey, lnPath }))
}

function stopServer() {
  if (proc) {
    console.log('Stopping embedded Spark server')
    proc.kill()
    proc = null
  }
}

function maybeStart() {
  if (store.get('autoStart')) return startServer(store.get('lnPath'))
  else return Promise.resolve(null)
}

app.on('before-quit', stopServer)

ipcMain.on('enableServer', async (e, lnPath) => {
  store.set({ autoStart: true, lnPath })
  e.sender.send('serverInfo', await startServer(lnPath))
})

ipcMain.on('disableServer', _ => {
  store.set('autoStart', false)
  stopServer()
})


module.exports = { maybeStart }
