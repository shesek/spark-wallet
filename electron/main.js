const {app, BrowserWindow} = require('electron')
    , control = require('./server-controller')

require('electron-debug')({ enabled: true, showDevTools: false })

// Ensure only a single instance is running
if (!app.requestSingleInstanceLock()) {
  app.quit()
  return
}

// Init app window
let mainWindow, loaded=false, initUri

async function createWindow () {
  loaded = false
  mainWindow = new BrowserWindow({
    width: 500, height: 960
  , webPreferences: { zoomFactor: 1.3 }
  })

  const sparkServer = await control.maybeStart()
  if (sparkServer) {
    // open a blank file to set serverInfo in the correct origin before opening the main app
    // @XXX this causes slightly slower load times
    mainWindow.loadFile('www/blank.html')
    await mainWindow.webContents.executeJavaScript('localStorage.serverInfo = '+JSON.stringify(JSON.stringify(sparkServer)))
  }

  mainWindow.loadFile('www/index.html')
  mainWindow.on('closed', _ => mainWindow = null)

  mainWindow.webContents.once('did-finish-load', _ => {
    loaded = true
    if (initUri) {
      mainWindow.webContents.send('handle-uri', initUri)
      initUri = null
    }
  })
}

app.on('ready', createWindow)
app.on('window-all-closed', _ => process.platform === 'darwin' || app.quit())
app.on('activate', _ => mainWindow || createWindow())


// Register handler for lightning: URIs
app.setAsDefaultProtocolClient('lightning')

function handleUri(uri) {
  if (loaded) {
    mainWindow.webContents.send('handle-uri', uri)
    mainWindow.isMinimized() && mainWindow.restore()
    mainWindow.focus()
  }
  else initUri = uri
}

// OS X emits URIs with the open-url event
app.on('open-url', (e, uri) => {
  e.preventDefault()
  handleUri(uri)
})

// Other platforms starts an instance with the URI specified in the argv
function parseArgv(argv){
  const uri = argv.find(arg => arg.startsWith('lightning:'))
  uri && handleUri(uri)
}
parseArgv(process.argv)
app.on('second-instance', (e, argv) => parseArgv(argv))
