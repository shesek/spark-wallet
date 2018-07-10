const {app, BrowserWindow} = require('electron')

require('electron-debug')({ showDevTools: false })

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 630, height: 900})
  mainWindow.loadFile('www/index.html')
  mainWindow.on('closed', _ => mainWindow = null)
}

app.on('ready', createWindow)
app.on('window-all-closed', _ => process.platform === 'darwin' || app.quit())
app.on('activate', _ => mainWindow || createWindow())
