const axios = require('axios')
const { app, shell, ipcMain, BrowserWindow, Notification, Menu } = require('electron')
const config = require('./config')
const isMac = process.platform === 'darwin'
const REMOTE_APP = 0
require('./index')

if (require('electron-squirrel-startup'))
    return app.quit()

let mainWindow

const menuTemplate = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    }] : []), {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { role: 'selectAll' },
            ...(isMac ? [
                { type: 'separator' },
                { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
            ] : [])
        ]
    }, {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    }, {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ] : [{ role: 'close' }])
        ]
    }, {
        role: 'help',
        submenu: [
            { label: 'Learn More', click: () => shell.openExternal('https://oneloveipfs.com') },
            { label: 'Documentation', click: () => shell.openExternal('https://docs.oneloveipfs.com') },
            { label: 'OneLoveDTube Discord Server', click: () => shell.openExternal('https://discord.gg/Sc4utKr') },
            { type: 'separator' },
            { label: 'Source Code', click: () => shell.openExternal('https://github.com/oneloveipfs/ipfsVideoUploader') },
            { label: 'View License', click: () => shell.openExternal('https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/LICENSE') }
        ]
    }
]

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: __dirname + '/scripts/electronPreload.js'
        },
        icon: process.platform === 'linux' ? __dirname+'/public/favicon.png' : undefined
    })

    let menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)

    app.setAboutPanelOptions({ version: config.Build.number.toString() })

    mainWindow.loadURL('http://localhost:'+config.HTTP_PORT)
    mainWindow.on('closed', () => mainWindow = null)
}

app.on('ready', createWindow)
app.on('resize', (e, x, y) => mainWindow.setSize(x, y))
app.on('window-all-closed', () => {
    if (!isMac)
        app.quit()
})

app.on('activate', () => {
    if (mainWindow === null)
        createWindow()
})

ipcMain.on('open_browser_window',(evt,arg) => shell.openExternal(arg))

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