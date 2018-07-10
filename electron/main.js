const {app, BrowserWindow} = require('electron')

require('electron-debug')({ showDevTools: false })

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 630, height: 900})

  mainWindow.loadFile('www/index.html')

  mainWindow.on('closed', function () { mainWindow = null  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

