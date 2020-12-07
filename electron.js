const { app, BrowserWindow } = require('electron')
const config = require('./config')
require('./index')

let mainWindow

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: { nodeIntegration: true }
    })

    mainWindow.loadURL('http://localhost:'+config.HTTP_PORT)
    mainWindow.on('closed', () => mainWindow = null)
}

app.on('ready', createWindow)
app.on('resize', (e, x, y) => mainWindow.setSize(x, y))
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit()
})

app.on('activate', () => {
    if (mainWindow === null)
        createWindow()
})