const { ipcRenderer } = require('electron')

process.once('loaded',() => {
    window.addEventListener('message',evt => {
        if (evt.data && evt.data.action && evt.data.data)
            ipcRenderer.send(evt.data.action,evt.data.data)
    })
})