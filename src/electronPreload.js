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
    passToRenderer('spk_video_upload_progress')
    passToRenderer('spk_video_upload_error')
    passToRenderer('spk_thumbnail_upload_progress')
    passToRenderer('spk_thumbnail_upload_error')
    passToRenderer('spk_upload_result')
    passToRenderer('spk_upload_error')
    passToRenderer('spk_list_uploads_result')
    passToRenderer('spk_update_info_result')
})