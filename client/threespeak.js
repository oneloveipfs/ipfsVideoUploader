// Mandatory fees imposed by 3Speak team + mobile/encoder
const SPK_FEES = {
    'spk.beneficiary': 850,
    'threespeakleader': 100
}

const SPK_AUTH_EXPIRY = 7*86400*1000
let spkUploadList = []

function spkNoticeCheckboxChanged() {
    document.getElementById('spkNoticeContinueBtn').disabled = !document.getElementById('spkUploadAgreeNotice').checked || !document.getElementById('spkUploadAgreeTerms').checked
}

function spkNoticeContinue() {
    let savedCookie = spkGetSavedCookie()
    if (!savedCookie) {
        updateDisplayByIDs(['spkauth'],['spknotice','spknotice-actions'])
        updateDisplayByIDs(['spkauth-actions'],[],'flex')
        document.getElementById('spkPopupHeader').innerText = '3Speak Auth'
    } else {
        dismissPopupAction('spkPopup')
        spkUpload(savedCookie)
    }
}

function spkGetAccessToken(cb) {
    togglePopupActions('spkauth-actions',true)
    if (isElectron()) {
        let savedCookie = spkGetSavedCookie()
        if (savedCookie)
            return cb(savedCookie)
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
        document.getElementById('spkListAuthHasEnc').innerText = result.memo
        document.getElementById('spkAuthHasEnc').innerText = result.memo
        updateDisplayByIDs(['spkListAuthHas','spkauthhas'],['spkListAuthIntro','spkListAuthIntro-actions','spkauth','spkauth-actions'])
        updateDisplayByIDs(['spkListAuthHas-actions','spkauthhas-actions'],[],'flex')
        return
        // return spkError('HiveAuth can\'t decrypt memos?!', 'spkauth-actions')
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
            let cookie = evt.data
            console.log(cookie)
            if (cookie.error)
                return spkError(cookie.error, 'spkauth-actions')
            document.cookie = cookie.cookie
            localStorage.setItem('spkLastAuth',new Date().getTime())
            localStorage.setItem('spkLastUser',usernameByNetwork('hive'))
            togglePopupActions('spkauth-actions',false)
            dismissPopupAction('spkPopup')
            dismissPopupAction('spkListPopup')
            updateDisplayByIDs([],['spkUploadListAuth'])
            channel.close()
            spkListUploads(cookie.cookie)
            cb(cookie.cookie)
        }
    } else
        spkError('Usage of 3Speak API is only available in desktop app','spkauth-actions')
}

function spkGetSavedCookie() {
    // assuming 3speak.tv cookies last way longer than 7d
    if (getCookie('connect.sid') && localStorage.getItem('spkLastUser') === usernameByNetwork('hive') && parseInt(localStorage.getItem('spkLastAuth'))+SPK_AUTH_EXPIRY > new Date().getTime())
        return 'connect.sid='+getCookie('connect.sid')
}

function spkDeleteSavedCookie() {
    document.cookie = 'connect.sid=; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

function spkUpload(cookie) {
    saveDraft()
    if (isElectron()) {
        updateDisplayByIDs(['uploadProgressBack'],[])
        updateProgressBar(0,'Uploading video...')
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
        let videoError = new BroadcastChannel('spk_video_upload_error')
        let thumbnailError = new BroadcastChannel('spk_thumbnail_upload_error')
        let uploadError = new BroadcastChannel('spk_upload_error')
        let uploadResult = new BroadcastChannel('spk_upload_result')
        let closeChannels = () => {
            videoProgress.close()
            thumbnailProgress.close()
            videoError.close()
            thumbnailError.close()
            uploadError.close()
            uploadResult.close()
        }
        videoProgress.onmessage = evt => updateProgressBar(evt.data,'Uploading video...')
        thumbnailProgress.onmessage = evt => updateProgressBar(evt.data,'Uploading thumbnail...')
        videoError.onmessage = evt => spkUploadError('Video',evt.data,closeChannels)
        thumbnailError.onmessage = evt => spkUploadError('Thumbnail',evt.data,closeChannels)
        uploadError.onmessage = evt => spkUploadError('',evt.data,closeChannels)
        uploadResult.onmessage = evt => {
            console.log('Upload result',evt.data)
            closeChannels()

            // set permlink to one provided by 3speak and save
            document.getElementById('customPermlink').value = evt.data.permlink
            postparams.spkUpload = evt.data._id
            saveDraft()

            document.getElementById('uploadProgressFront').style.width = '100%'
            document.getElementById('uploadProgressFront').innerHTML = 'All done, please wait for processing on 3Speak\'s end.'
        }
    }
}

function spkUploadError(type,msg,cb) {
    alert((type?type+' ':'')+'upload error: '+msg)
    updateDisplayByIDs([],['uploadProgressBack'])
    cb()
}

function spkListUploads(cookie, cb) {
    window.postMessage({ action: 'spk_list_uploads', data: cookie })
    let channel = new BroadcastChannel('spk_list_uploads_result')
    channel.onmessage = evt => {
        channel.close()
        console.log(evt.data)
        if (evt.data.uploads) {
            spkUploadList = evt.data.uploads
            let spkULTbody = new TbodyRenderer()
            for (let i in evt.data.uploads)
                spkULTbody.appendRow(
                    HtmlSanitizer.SanitizeHtml(evt.data.uploads[i].permlink),
                    new Date(evt.data.uploads[i].created).toLocaleString(),
                    spkReadableStatus(HtmlSanitizer.SanitizeHtml(evt.data.uploads[i].status)),
                    spkUploadViewBtn(evt.data.uploads[i],i)
                )
            updateDisplayByIDs(['spkUploadListTable'],[],'table')
            document.getElementById('spkUploadListTbody').innerHTML = spkULTbody.renderRow()
            updateAnchorsElectron()
        }
        if (typeof cb === 'function')
            cb()
    }
}

function spkReadableStatus(status = '') {
    if (status === 'publish_manual')
        return 'ready to publish'
    else
        return status.replace(/_/g,' ')
}

function spkUploadViewBtn(uploadObj,idx) {
    if (uploadObj.status === 'published')
        return `<a class="styledButton styledButtonSmall" href="https://3speak.tv/watch?v=${uploadObj.owner}/${uploadObj.permlink}" target="_blank">View</a>`
    else if (uploadObj.status === 'publish_manual')
        return `<a class="styledButton styledButtonSmall" onclick="spkLoadMetadataPostUpload('${uploadObj.permlink}',${idx})">View</a>`
    else
        return ''
}

function spkLoadMetadataPostUpload(pm,idx) {
    let draft = retrieveDraft(pm)
    if (!draft) {
        sessionStorage.setItem('editingDraft',pm)
        document.getElementById('newUploadModeBtn').onclick()
        document.getElementById('editingDraftMsg').innerText = 'Finalizing 3Speak upload metadata: '+pm+', last saved: never'
        document.getElementById('title').value = spkUploadList[idx].title
        document.getElementById('description').value = spkUploadList[idx].description
        updateDisplayByIDs(['editingDraft'],[])
    }
    document.getElementById('videoduration').value = spkUploadList[idx].duration
    document.getElementById('editingDraftMsg').innerText = document.getElementById('editingDraftMsg').innerText.replace('Editing draft','Finalizing 3Speak upload metadata')
    document.getElementById('submitbutton').value = 'Submit'
    setDisplayByClass('fileUploadField')
    postparams.spkIdx = idx
    sessionStorage.setItem('editingMode',3)
}

function spkUpdateDraft(cookie, idx, title, desc, tags, nsfw, thumbnail, cb) {
    window.postMessage({
        action: 'spk_update_info',
        data: {
            cookie: cookie,
            id: spkUploadList[idx]._id,
            title: title,
            desc: desc,
            tags: tags,
            thumbnail: thumbnail,
            nsfw: nsfw
        }
    })
    let channel = new BroadcastChannel('spk_update_info_result')
    channel.onmessage = (evt) => {
        channel.close()
        console.log(evt.data)
        spkRefreshList(cookie, idx, (newIdx) => {
            if(typeof cb === 'function')
                cb(newIdx,evt.data)
        })
    }
}

function spkRefreshList(cookie, currentIdx, cb) {
    let oldId = spkUploadList[currentIdx]._id
    spkListUploads(cookie, () => {
        if (typeof currentIdx === 'number' || !isNaN(parseInt(currentIdx)))
            for (let i in spkUploadList)
                if (spkUploadList[i]._id === oldId)
                    return cb(i)
    })
}

function spkGetIdxByPermlink(pm) {
    for (let i in spkUploadList)
        if (spkUploadList[i].permlink === pm)
            return i
    return -1
}

function spkPosting() {
    return !isNaN(parseInt(postparams.spkIdx)) && spkUploadList.length > parseInt(postparams.spkIdx)
}

function spkFinalizePublish(cookie, idx, cb) {
    window.postMessage({
        action: 'spk_finalize_publish',
        data: {
            cookie: cookie,
            id: spkUploadList[idx]._id
        }
    })
    let channel = new BroadcastChannel('spk_finalize_publish_result')
    channel.onmessage = (evt) => {
        channel.close()
        console.log(evt.data)
        spkRefreshList(cookie, idx, (newIdx) => {
            if(typeof cb === 'function')
                cb(newIdx,evt.data)
        })
    }
}

function spkFinalizePublishPromise(cookie, idx) {
    return new Promise((rs) => spkFinalizePublish(cookie,idx,rs))
}

function spkError(error, group) {
    alert(error)
    if (group)
        togglePopupActions(group,false)
}

async function spkPinRequestStart() {
    updateDisplayByIDs(['uploadProgressBack'],[])
    let progressbarInner = document.getElementById('uploadProgressFront')
    progressbarInner.style.width = '100%'
    progressbarInner.innerText = 'Creating pin requests...'
    let hlsHash = postparams.ipfshash.split('/')[0]
    let hlsPinCompl = false, thumbnailPinCompl = false
    let hlsPinReqCreate = await spkPinRequestCreate(hlsHash,'hls')
    if (!hlsPinReqCreate)
        return updateDisplayByIDs([],['uploadProgressBack'])
    let thumbnailPinReqCreate = await spkPinRequestCreate(postparams.imghash,'thumbnails')
    if (!thumbnailPinReqCreate)
        return updateDisplayByIDs([],['uploadProgressBack'])
    progressbarInner.innerText = 'Pinning files from 3Speak to IPFS node...'
    let allPinIvl = setInterval(async () => {
        if (hlsPinCompl && thumbnailPinCompl) {
            clearInterval(allPinIvl)
            postVideo() // pinnings complete
        }
    })
    let hlsPinIvl = setInterval(async () => {
        let q = await spkPinRequestQuery('hls')
        if (q.error) {
            clearInterval(hlsPinIvl)
            clearInterval(allPinIvl)
            spkError(q.error)
        } else if (q.status === 1) {
            clearInterval(hlsPinIvl)
            for (let i in q.dir)
                if (q.dir[i].type === 'dir') {
                    if (q.dir[i].name === '1080p')
                        postparams.ipfs1080hash = hlsHash+'/1080p/index.m3u8'
                    else if (q.dir[i].name === '720p')
                        postparams.ipfs720hash = hlsHash+'/720p/index.m3u8'
                    else if (q.dir[i].name === '480p')
                        postparams.ipfs480hash = hlsHash+'/480p/index.m3u8'
                    else if (q.dir[i].name === '240p')
                        postparams.ipfs240hash = hlsHash+'/240p/index.m3u8'
                }
            hlsPinCompl = true
        }
    },5000)
    let thumbnailPinIvl = setInterval(async () => {
        let q = await spkPinRequestQuery('thumbnails')
        if (q.error) {
            clearInterval(thumbnailPinIvl)
            clearInterval(allPinIvl)
            spkError(q.error)
        } else if (q.status === 1) {
            clearInterval(thumbnailPinIvl)
            thumbnailPinCompl = true
        }
    },5000)
}

async function spkPinRequestCreate(hash, type) {
    let call = '/spk/pin'+'?access_token='+Auth.token
    if (Auth.iskeychain !== 'true')
        call += '&scauth=true'
    try {
        let pinRequest = await axios.post(call,{
            hash: hash,
            type: type
        },{ headers: { 'Content-Type': 'application/json' }})
        if (pinRequest.status === 200) {
            if (!postparams.spkPinRequests)
                postparams.spkPinRequests = {}
            postparams.spkPinRequests[type] = pinRequest.data.id
            return true
        } else {
            spkError(pinRequest.data.error)
            return false
        }
    } catch (e) {
        console.log(e)
        spkError('Failed to create '+type+' pin request')
        return false
    }
}

async function spkPinRequestQuery(type) {
    let call = '/spk/pin/status/'+postparams.spkPinRequests[type].split(':')[1]+'?access_token='+Auth.token
    if (Auth.iskeychain !== 'true')
        call += '&scauth=true'
    try {
        let pinRequest = await axios.get(call)
        console.log(pinRequest)
        return pinRequest.data
    } catch (e) {
        if (e.response && e.response.status === 404)
            return { error: 'not found' }
        return { error: e }
    }
}