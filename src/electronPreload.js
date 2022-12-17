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
    passToRenderer('spk_thumbnail_upload_result')
    passToRenderer('spk_upload_result')
    passToRenderer('spk_upload_error')
    passToRenderer('spk_list_uploads_result')
    passToRenderer('spk_update_info_result')
    passToRenderer('spk_finalize_publish_result')
    passToRenderer('fs_upload_error')
    passToRenderer('fs_upload_result')
    passToRenderer('self_encode_error')
    passToRenderer('self_encode_progress')
    passToRenderer('self_encode_step')
    passToRenderer('self_encode_upload_result')
})