const axios = require('axios')
const { app, shell, BrowserWindow, Notification } = require('electron')
const config = require('./config')
require('./index')

if (require('electron-squirrel-startup'))
    return app.quit()

let mainWindow

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: { nodeIntegration: true },
        icon: process.platform === 'linux' ? __dirname+'/public/favicon.png' : undefined
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

// Update check
axios.get('https://uploader.oneloved.tube/latest_build').then((build) => {
    if (config.Build.number < build.data.number) {
        let updateNotify = new Notification({
            title: 'An update is available',
            body: 'The latest version is ' + build.data.version + ' (build ' + build.data.number + '). Click here to download.',
            urgency: 'normal'
        })
        updateNotify.on('click',() => shell.openExternal(build.data.link))
        updateNotify.show()
    }
}).catch(() => {})