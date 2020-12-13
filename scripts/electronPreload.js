const { ipcRenderer } = require('electron')

process.once('loaded',() => {
    window.addEventListener('message',evt => {
        ipcRenderer.send(evt.data.action,evt.data.data)
    })
})