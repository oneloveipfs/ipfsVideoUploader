// Mandatory fees imposed by 3Speak team
const SPK_FEES = {
    'spk.beneficiary': 850,
    threespeakleader: 100,
    sagarkothari88: 100
}

const SPK_ENCODER_FEE = 100

function spkNoticeCheckboxChanged() {
    document.getElementById('spkNoticeContinueBtn').disabled = !document.getElementById('spkUploadAgreeNotice').checked || !document.getElementById('spkUploadAgreeTerms').checked
}

function spkNoticeContinue() {
    updateDisplayByIDs(['spkauth'],['spknotice','spknotice-actions'])
    updateDisplayByIDs(['spkauth-actions'],[],'flex')
    document.getElementById('spkPopupHeader').innerText = '3Speak Auth'
}

function spkGetAccessToken(cb) {
    togglePopupActions('spkauth-actions',true)
    if (isElectron()) {
        window.postMessage({ action: 'spk_auth', data: usernameByNetwork('hive') })
        let channel = new BroadcastChannel('spk_auth_result')
        channel.onmessage = (evt) => {
            spkAuthResult(evt.data,cb)
            channel.close()
        }
    } else
        spkError('Usage of 3Speak API is only available in desktop app','spkauth-actions')
}

function spkAuthResult(result,cb) {
    if (result.error)
        return spkError(result.error, 'spkauth-actions')
    if (hiveAuthLogin) {
        return spkError('HiveAuth can\'t decrypt memos?!', 'spkauth-actions')
    } else if (isElectron()) {
        let t
        try {
            t = hivecrypt.decode(sessionStorage.getItem('hiveKey'),result.memo).substr(1)
        } catch {
            return spkError('Failed to decode memo with posting key', 'spkauth-actions')
        }
        spkRequestCookie(t,cb)
    } else if (window.hive_keychain)
        hive_keychain.requestVerifyKey(usernameByNetwork('hive'),result.memo,'Posting',kr => {
            if (kr.error)
                return spkError(kr.message, 'spkauth-actions')
            spkRequestCookie(kr.result,cb)
        })
    else
        return spkError('Could not determine hive login', 'spkauth-actions')
}

function spkRequestCookie(token,cb) {
    if (isElectron()) {
        window.postMessage({ action: 'spk_cookie', data: { user: usernameByNetwork('hive'), token: token } })
        let channel = new BroadcastChannel('spk_cookie_result')
        channel.onmessage = (evt) => {
            console.log(cookie)
            if (cookie.error)
                return spkError(cookie.error, 'spkauth-actions')
            document.cookie = cookie.cookie
            togglePopupActions('spkauth-actions',false)
            dismissPopupAction('spkPopup')
            channel.close()
            cb(cookie.cookie)
        }
    } else
        spkError('Usage of 3Speak API is only available in desktop app','spkauth-actions')
}

function spkUpload(cookie) {
    saveDraft()
    if (isElectron()) {
        let v = document.getElementById('sourcevideo').files[0]
        let vpathsplit = v.path.split('/')
        window.postMessage({
            action: 'spk_upload',
            data: {
                cookie: cookie,
                user: usernameByNetwork('hive'),
                videoPath: v.path,
                thumbnailPath: document.getElementById('snapfile').files[0].path,
                videoFname: vpathsplit[vpathsplit.length-1],
                size: v.size,
                duration: postparams.duration
            }
        })
        let videoProgress = new BroadcastChannel('spk_video_upload_progress')
        let thumbnailProgress = new BroadcastChannel('spk_thumbnail_upload_progress')
        videoProgress.onmessage = evt => console.log('Video progress',evt.data)
        thumbnailProgress.onmessage = evt => console.log('Thumbnail progress',evt.data)

        let videoError = new BroadcastChannel('spk_video_upload_error')
        let thumbnailError = new BroadcastChannel('spk_video_thumbnail_error')
        let uploadError = new BroadcastChannel('spk_upload_error')
        videoError.onmessage = evt => console.log('Video error',evt.data)
        thumbnailError.onmessage = evt => console.log('Thumbnail error',evt.data)
        uploadError.onmessage = evt => console.log('Upload error',evt.data)

        let uploadResult = new BroadcastChannel('spk_upload_result')
        uploadResult.onmessage = evt => {
            console.log('Upload result',evt.data)
            videoProgress.close()
            thumbnailProgress.close()
            videoError.close()
            thumbnailError.close()
            uploadError.close()
            uploadResult.close()

            // set permlink to one provided by 3speak and save
            document.getElementById('customPermlink').value = evt.data.permlink
            postparams.spkUpload = evt.data._id
            saveDraft()
        }
    }
}

function spkError(error, group) {
    alert(error)
    if (group)
        togglePopupActions(group,false)
}