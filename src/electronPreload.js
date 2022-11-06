const { ipcRenderer } = require('electron')

const passToRenderer = (evtName) => {
    ipcRenderer.on(evtName, (evt, result) => {
        let channel = new BroadcastChannel(evtName)
        channel.postMessage(result)
    })
}

process.once('loaded',() => {
    window.addEventListener('message',evt => {
        if (evt.data && evt.data.action && evt.data.data)
            ipcRenderer.send(evt.data.action,evt.data.data)
    })

    passToRenderer('spk_auth_result')
    passToRenderer('spk_cookie_result')
})