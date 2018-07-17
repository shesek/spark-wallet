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
  proc.on('message', m => console.log('Spark server msg', m))
  proc.on('exit', code => console.log('Spark server exited with status', code))
  proc.on('exit', _ => proc = null)

  return new Promise((resolve, reject) =>
    proc.once('message', m => m.serverUrl ? resolve(m.serverUrl)
                                          : reject(new Error(m.error || 'unknown message '+m)))
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
  try {
    e.sender.send('serverInfo', await startServer(lnPath))
    store.set({ autoStart: true, lnPath })
  }
  catch (err) { e.sender.send('serverError', err.message)  }
})

ipcMain.on('disableServer', _ => {
  store.set('autoStart', false)
  stopServer()
})

module.exports = { maybeStart }
