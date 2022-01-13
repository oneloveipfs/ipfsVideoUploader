// Load auth details
let username

let hiveOptions = {
    url: 'https://techcoderx.com',
    useAppbaseApi: true,
    rebranded_api: true,
}

hive.api.setOptions(hiveOptions)

// Setup subtitles tab
const allLangCodes = languages.getAllLanguageCode()
let langOptions = ''
let langNameList = []
for(let i = 0; i < allLangCodes.length; i++) {
    let langName = languages.getLanguageInfo(allLangCodes[i]).name
    langOptions += '<option value="' + langName + '">'
    langNameList.push(langName)
}

let subtitleList = []
try {
    let savedSubtitles = JSON.parse(localStorage.getItem('OneLoveSubtitles'))
    if (savedSubtitles)
        subtitleList = savedSubtitles
} catch {}

// Beneficiaries
let hiveBeneficiaries = new Beneficiaries('Hive')
let steemBeneficiaries = new Beneficiaries('Steem')
let blurtBeneficiaries = new Beneficiaries('Blurt')

// Load Avalon login
let avalonUser = sessionStorage.getItem('avalonUser')
let avalonKey = sessionStorage.getItem('avalonKey')

// Post parameters (videohash, video240, video480 etc)
let postparams = {}

// Socket.io connection to server
let uplStat
axios.get('/proxy_server').then((r) => {
    uplStat = io.connect(r.data.server+'/uploadStat')
    uplStat.on('progress',(p) => {
        console.log('progress',p)
    })
    uplStat.on('error',(e) => {
        console.log('upload processing error',e)
    })
    uplStat.on('result',(r) => {
        if (r.error) return console.log('uplStat Error', r.error)
        switch (r.type) {
            case 'videos':
                let existingDuration = postparams.duration
                postparams = Object.assign(postparams,r)
                // use duration from fake player if possible
                if (existingDuration && typeof existingDuration === 'number')
                    postparams.duration = existingDuration
                break
            case 'video240':
                postparams.ipfs240hash = r.hash
                if (r.skylink) postparams.skylink240 = r.skylink
                break
            case 'video480':
                postparams.ipfs480hash = r.hash
                if (r.skylink) postparams.skylink480 = r.skylink
                break
            case 'video720':
                postparams.ipfs720hash = r.hash
                if (r.skylink) postparams.skylink720 = r.skylink
                break
            case 'video1080':
                postparams.ipfs1080hash = r.hash
                if (r.skylink) postparams.skylink1080 = r.skylink
                break
            case 'hls':
                postparams = Object.assign(postparams,r)
                break
            default:
                return console.log('uplStat Error: missing type in repsonse')
        }
        postVideo()
        console.log(postparams)
    })
}).catch((e) => console.log(e))

// Vars loaded from config
let config;

document.addEventListener('DOMContentLoaded', async () => {
    await Auth.Avalon()
    username = await Auth.Hive()
    loadSelectPlatforms()
    updateSubtitle()
    // Get configuration, then load accounts and authorities
    axios.get('/config').then((result) => {
        config = result.data

        loadPins('videos')

        if (config.disabled) {
            document.getElementById('disabledText').innerText = config.disabledMessage
            document.getElementById('disabledImg').src = 'public/memes/' + config.disabledMeme
            updateDisplayByIDs(['disabledPage'],['uploadForm','modeBtn'])
        }

        // Hide Avalon first curated tag info if not logged in with Avalon
        if (!avalonUser || !avalonKey) {
            document.getElementById('tagInfo1').style.display = 'none'
        } else {
            javalon.getAccount(avalonUser,(err,acc) => {
                if (err) return
                document.getElementById('dtcBurnInput').placeholder = 'Available: ' + thousandSeperator(acc.balance / 100) + ' DTC'
                document.getElementById('avalonvwlabel').innerText = 'Avalon vote weight: 1% (~' + thousandSeperator(Math.floor(0.01 * javalon.votingPower(acc))) + ' VP)'
                window.availableForBurn = acc.balance / 100
                window.availableAvalonBw = acc.bw
                window.availableAvalonVP = acc.vt
                loadAvalonAuthorityStatus(acc)
            })
            if (dtconly === 'true') {
                document.getElementById('tagLbl').innerText = 'Tag:'
                document.getElementById('tagInfo1').style.display = 'none'
            }
        }

        if (steemUser && config.steemloginApp) steem.api.getAccounts([steemUser],(e,acc) => {
            if (e) return
            loadGrapheneAuthorityStatus(acc[0],'steem')
            getCommunitySubs(acc[0].name,'steem')
        })
        else
            updateDisplayByIDs([],['beneficiaryHeadingSteem','beneficiaryTableListSteem','totalBeneficiariesLabelSteem','steemCommunity'])

        if (blurtUser && config.blurtApp)
            blurt.api.getAccounts([blurtUser],(e,acc) => {
                if (e) return
                loadGrapheneAuthorityStatus(acc[0],'blurt')
            })
        else
            updateDisplayByIDs([],['beneficiaryHeadingBlurt','beneficiaryTableListBlurt','totalBeneficiariesLabelBlurt'])

        hive.api.setOptions(hiveOptions)
        if (!dtconly) hive.api.getAccounts([username],(e,acc) => {
            if (e) return
            if (acc.length > 0)
                loadGrapheneAuthorityStatus(acc[0],'hive')
            getCommunitySubs(username,'hive')
        })
    })

    // TODO: Display warning if resumable uploads is unavailable
    if (tus.isSupported) {
        console.log('tus is supported')
    } else {
        console.log('tus is not supported')
    }

    document.getElementById('languages').innerHTML = langOptions

    document.getElementById('tabBasics').onclick = () => {
        document.getElementById('advanced').style.display = "none"
        document.getElementById('subtitles').style.display = "none"
        document.getElementById('basics').style.display = "block"
        document.getElementById('tabAdvanced').style.backgroundColor = "transparent"
        document.getElementById('tabSubtitles').style.backgroundColor = "transparent"
        document.getElementById('tabBasics').style.backgroundColor = "#2196F3"
        return true
    }

    document.getElementById('tabAdvanced').onclick = () => {
        document.getElementById('advanced').style.display = "block"
        document.getElementById('subtitles').style.display = "none"
        document.getElementById('basics').style.display = "none"
        document.getElementById('tabAdvanced').style.backgroundColor = "#2196F3"
        document.getElementById('tabSubtitles').style.backgroundColor = "transparent"
        document.getElementById('tabBasics').style.backgroundColor = "transparent"
        return true
    }

    document.getElementById('tabSubtitles').onclick = () => {
        document.getElementById('advanced').style.display = "none"
        document.getElementById('subtitles').style.display = "block"
        document.getElementById('basics').style.display = "none"
        document.getElementById('tabAdvanced').style.backgroundColor = "transparent"
        document.getElementById('tabSubtitles').style.backgroundColor = "#2196F3"
        document.getElementById('tabBasics').style.backgroundColor = "transparent"
        return true
    }

    document.getElementById('tags').onchange = () => document.getElementById('tags').value = document.getElementById('tags').value.toLowerCase()

    document.getElementById('submitbutton').onclick = () => {
        // Validate data entered
        postparams.postBody = document.getElementById('postBody').value
        postparams.description = document.getElementById('description').value
        postparams.powerup = document.getElementById('powerup').checked
        postparams.permlink = generatePermlink()
        if (document.getElementById('customPermlink').value != '') postparams.permlink = document.getElementById('customPermlink').value

        let sourceVideo = document.getElementById('sourcevideo').files
        let snap = document.getElementById('snapfile').files
        let title = document.getElementById('title').value
        if (title.length > 256)
            return alert('Title is too long!')

        let tag = document.getElementById('tags').value
        if (/^[a-z0-9- _]*$/.test(tag) == false)
            return alert('Invalid tags!')

        let tags = tag.split(' ')
        if (tags.length > 8)
            return alert('Please do not use more than 8 tags!')

        // Check for empty fields
        if (sourceVideo.length == 0)
            return alert('Please upload a video!')

        if (snap.length == 0)
            return alert('Please upload a thumbnail for your video!')

        if (title.length == 0)
            return alert('Please enter a title!')
        postparams.title = title

        if (tag.length == 0)
            return alert('Please enter some tags (up to 8) for your video!')
        postparams.tags = tags

        // Avalon bandwidth check (untested)
        // if (avalonUser && avalonKey && needsBandwidth())
        //     return alert('You need approximately ' + needsBandwidth() + ' additional bytes in your Avalon account to post this video.')

        // Auth.restrict()

        // Upload thumbnail
        let formdata = new FormData()
        formdata.append('image',snap[0])

        let progressbar = document.getElementById('progressBarBack')
        let progressbarInner = document.getElementById('progressBarFront')
        progressbar.style.display = "block"
        progressbarInner.innerHTML = "Uploading thumbnail... (0%)"

        let contentType = {
            headers: {
                "content-type": "multipart/form-data"
            },
            onUploadProgress: function (progressEvent) {
                console.log(progressEvent)

                let progressPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                updateProgressBar(progressPercent,'Uploading thumbnail...')
            }
        }

        let call = '/uploadImage?type=thumbnails&access_token=' + Auth.token
        if (Auth.iskeychain !== 'true')
            call += '&scauth=true'
        axios.post(call,formdata,contentType).then(function(response) {
            let uploaderResponse = response.data
            console.log(uploaderResponse)

            if (uploaderResponse.error != null) {
                reenableFields()
                progressbar.style.display = "none"
                return alert(uploaderResponse.error)
            }

            postparams = Object.assign(postparams,uploaderResponse)

            // Upload all videos
            if (document.getElementById('hlsencode').checked)
                uploadVideo(-1,() => console.log('begin encode'),uploaderResponse.fsname)
            else
                uploadVideo(0,() => console.log('all videos uploaded successfully'))
        }).catch((err) => {
            if (err.response && err.response.data && err.response.data.error)
                alert(err.response.data.error)
            else
                alert(err.toString())
            progressbar.style.display = "none"
            reenableFields()
        })
    }

    document.getElementById('avalonvw').oninput = () => {
        let avalonVW = document.getElementById('avalonvw').value
        document.getElementById('avalonvwlabel').innerText = 'Avalon vote weight: ' + avalonVW + '% (~' + thousandSeperator(Math.floor(avalonVW/100 * javalon.votingPower({vt: window.availableAvalonVP, balance: window.availableForBurn * 100}))) + ' VP)'
        if (avalonVW > 30)
            document.getElementById('avalonhighvwalert').style.display = 'block'
        else
            document.getElementById('avalonhighvwalert').style.display = 'none'
    }

    document.getElementById('postImg').onchange = () => {
        let postImg = document.getElementById('postImg').files;
        if (postImg.length == 0) {
            // do not upload if no images are selected
            return;
        }

        let imgFormData = new FormData()
        imgFormData.append('image',postImg[0])

        restrictImg();

        let progressbar = document.getElementById('progressBarBack')
        let progressbarInner = document.getElementById('progressBarFront')
        progressbar.style.display = "block";
        progressbarInner.innerHTML = "Uploading... (0%)";

        let contentType = {
            headers: {
                "content-type": "multipart/form-data"
            },
            onUploadProgress: function (progressEvent) {
                let progressPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                updateProgressBar(progressPercent);
            }
        }

        let call = '/uploadImage?type=images&access_token=' + Auth.token
        if (Auth.iskeychain !== 'true')
            call += '&scauth=true'
        axios.post(call,imgFormData,contentType).then(function(response) {
            console.log(response);
            progressbar.style.display = "none";
            document.getElementById('postBody').value += ('\n![' + document.getElementById('postImg').value.replace(/.*[\/\\]/, '') + '](https://ipfs.io/ipfs/' + response.data.imghash + ')');
            reenableFieldsImg();
        }).catch(function(err) {
            if (err.response.data.error)
                alert('Upload error: ' + err.response.data.error)
            else
                alert('Upload error: ' + err);
            progressbar.style.display = "none";
            reenableFieldsImg();
        })
    }

    // Subtitles
    let chosenSubtitleContent = ''

    document.getElementById('subtitleUpload').onchange = () => {
        if (document.getElementById('subtitleUpload').files.length == 0) {
            document.getElementById('chooseSubBtn').innerHTML = 'Choose subtitle file'
            chosenSubtitleContent = ''
        } else {
            document.getElementById('chooseSubBtn').innerHTML = 'Change subtitle file'
            let reader = new FileReader()
            reader.onload = (r) => chosenSubtitleContent = r.target.result
            reader.readAsText(document.getElementById('subtitleUpload').files[0])
        }
    }

    document.getElementById('uploadSubBtn').onclick = () => {
        let subtitleFile = document.getElementById('subtitleUpload').files
        let selectedLanguage = document.getElementById('newLanguageField').value

        if (selectedLanguage == '')
            return alert('Please select a language for your subtitle!')
        if (!langNameList.includes(selectedLanguage))
            return alert('Selected language is invalid!')
        if (subtitleFile.length == 0)
            return alert('Please choose a WebVTT subtitle file to upload.')
        
        document.getElementById('newLanguageField').disabled = true
        document.getElementById('chooseSubBtn').disabled = true
        document.getElementById('uploadSubBtn').disabled = true

        const contentType = {
            headers: {
                "content-type": "text/plain"
            }
        }

        let call = '/uploadSubtitle?access_token=' + Auth.token
        if (Auth.iskeychain !== 'true')
            call += '&scauth=true'
        axios.post(call,chosenSubtitleContent,contentType).then((response) => {
            let selectedLangCode = langNameList.indexOf(selectedLanguage)
            subtitleList.push({
                lang: allLangCodes[selectedLangCode],
                hash: response.data.hash
            })
            console.log(subtitleList)

            // Reset fields
            document.getElementById('chooseSubBtn').innerHTML = 'Choose subtitle file'
            document.getElementById('newLanguageField').value = ''
            reenableSubtitleFields()
            updateSubtitle()
        }).catch((err) => {
            reenableSubtitleFields()
            if (err.response.data.error) alert(err.response.data.error)
            else alert(err)
        })

        return true
    }

    document.getElementById('appendBeneficiaryBtn').onclick = () => {
        let account = document.getElementById('newBeneficiaryUser').value
        let percentage = Math.floor(document.getElementById('newBeneficiaryPercent').value * 100)
        let network = document.getElementById('newBeneficiaryNetwork').value
        let nobj = {
            Hive: {
                method: hive.api.getAccounts,
                benef: hiveBeneficiaries,
                cu: hiveDisplayUser
            },
            Steem: {
                method: steem.api.getAccounts,
                benef: hiveBeneficiaries,
                cu: steemUser
            },
            Blurt: {
                method: blurt.api.getAccounts,
                benef: blurtBeneficiaries,
                cu: blurtUser
            }
        }

        for (let n in nobj) if ((network === 'All' || network === n) && nobj[n].cu) nobj[n].method([account],(err,result) => {
            if (err) return alert('Error while validating '+n+' account: ' + err)
            if (result.length === 0) return alert('Beneficiary account specified doesn\'t exist on '+n)

            try {
                nobj[n].benef.addAccount(account,percentage)
            } catch (e) {
                return alert(e)
            }
        })
    }

    // Drafts
    document.getElementById('draftBtn').onclick = () => {
        localStorage.setItem('OneLoveTitle',document.getElementById('title').value)
        localStorage.setItem('OneLoveDescription',document.getElementById('description').value)
        localStorage.setItem('OneLoveTags',document.getElementById('tags').value)
        localStorage.setItem('OneLovePostBody',document.getElementById('postBody').value)
        localStorage.setItem('OneLoveSubtitles',JSON.stringify(subtitleList))
        localStorage.setItem('DraftGraphenePermlink',document.getElementById('customPermlink').value)
        localStorage.setItem('DraftSteemBeneficiaries',JSON.stringify(steemBeneficiaries.accounts))
        localStorage.setItem('DraftHiveBeneficiaries',JSON.stringify(hiveBeneficiaries.accounts))
        localStorage.setItem('DraftBlurtBeneficiaries',JSON.stringify(blurtBeneficiaries.accounts))
        localStorage.setItem('DraftSteemCommunity',document.getElementById('steemCommunitySelect').value)
        localStorage.setItem('DraftHiveCommunity',document.getElementById('hiveCommunitySelect').value)
        localStorage.setItem('DraftPowerUp',document.getElementById('powerup').checked)
        localStorage.setItem('DraftSkynetUpload',document.getElementById('skynetupload').checked)
        alert('Metadata saved as draft!')
    }
})

function sourceVideoSelect() {
    // Retrieve video duration from fake audio player
    let selected = document.getElementById('sourcevideo').files
    if (selected.length < 1) {
        if (postparams.duration)
            delete postparams.duration
        return
    }
    let audioObj = document.createElement('audio')
    audioObj.autoplay = false
    audioObj.addEventListener('canplaythrough',(evt) => postparams.duration = evt.currentTarget.duration)
    let videoObjUrl = URL.createObjectURL(selected[0])
    audioObj.src = videoObjUrl
}

function uploadVideo(resolution,next,thumbnailFname = '') {
    let fInputElemName
    let resolutionFType
    let progressTxt
    switch (resolution) {
        case -1:
            fInputElemName = 'sourcevideo'
            resolutionFType = 'hls'
            progressTxt = 'Uploading video...'
            break
        case 0:
            fInputElemName = 'sourcevideo'
            resolutionFType = 'videos'
            progressTxt = 'Uploading source video...'
            break
        case 1:
            fInputElemName = 'video240p'
            resolutionFType = 'video240'
            progressTxt = 'Uploading 240p video...'
            break
        case 2:
            fInputElemName = 'video480p'
            resolutionFType = 'video480'
            progressTxt = 'Uploading 480p video...'
            break
        case 3:
            fInputElemName = 'video720p'
            resolutionFType = 'video720'
            progressTxt = 'Uploading 720p video...'
            break
        case 4:
            fInputElemName = 'video1080p'
            resolutionFType = 'video1080'
            progressTxt = 'Uploading 1080p video...'
            break
        default:
            return next()
    }

    let videoToUpload = document.getElementById(fInputElemName).files

    if (videoToUpload.length < 1) return uploadVideo(resolution+1,next)

    let progressbar = document.getElementById('progressBarBack')
    let progressbarInner = document.getElementById('progressBarFront')
    progressbar.style.display = 'block'

    if (config.uploadFromFs && isElectron()) {
        progressbarInner.innerText = 'Submitting upload...'
        return axios.post('/uploadVideoFs'+geturl,{
            type: resolutionFType,
            thumbnailFname: thumbnailFname,
            skynet: document.getElementById('skynetupload').checked ? 'true' : 'false',
            filepath: videoToUpload[0].path
        }).then(result => {
            progressbarInner.innerHTML = "Processing video..."
            uplStat.emit('registerid',{
                id: result.data.id,
                type: resolutionFType,
                access_token: Auth.token,
                keychain: Auth.iskeychain
            })
            if (resolution >= 0)
                uploadVideo(resolution+1,next)
            else
                next()
        }).catch(e => {
            console.log(e)
            alert('Error occured while submitting file')
        })
    }
    progressbarInner.innerHTML = 'Uploading... (0%)'

    let videoUpload = new tus.Upload(videoToUpload[0], {
        endpoint: config.tusdEndpoint,
        retryDelays: [0,3000,5000,10000,20000],
        parallelUploads: parseInt(usersettings.uplThreads) || 10,
        metadata: {
            access_token: Auth.token,
            keychain: Auth.iskeychain,
            type: resolutionFType,
            thumbnailFname: thumbnailFname,
            skynet: document.getElementById('skynetupload').checked ? 'true' : 'false'
        },
        onError: (e) => {
            console.log('tus error',e)
        },
        onProgress: (bu,bt) => {
            let progressPercent = Math.round((bu / bt) * 100)
            updateProgressBar(progressPercent,progressTxt)
            console.log('Progress: ' + progressPercent + '%')
        },
        onSuccess: () => {
            progressbarInner.innerHTML = "Processing video..."

            let url = videoUpload.url.toString().split('/')
            console.log("Upload ID: " + url[url.length - 1]) // ID of upload
            uplStat.emit('registerid',{
                id: url[url.length - 1],
                type: resolutionFType,
                access_token: Auth.token,
                keychain: Auth.iskeychain
            })
            if (resolution >= 0)
                uploadVideo(resolution+1,next)
            else
                next()
        }
    })
    
    videoUpload.findPreviousUploads().then((p) => {
        if (p.length > 0)
            videoUpload.resumeFromPreviousUpload(p[0])
        videoUpload.start()
    })
}

function restrictImg() {
    const toDisable = ['postBody','postImgBtn','draftBtn','submitbutton']
    for (let i = 0; i < toDisable.length; i++) document.getElementById(toDisable[i]).disabled = true
}

function reenableFields() {
    const toEnable = ['sourcevideo','snapfile','title','description','tags','powerup','postBody','postImgBtn','draftBtn','submitbutton','newLanguageField','chooseSubBtn','uploadSubBtn','thumbnailSwapLink','linkSubmitBtn','newSnap','swapSubmitBtn']
    for (let i = 0; i < toEnable.length; i++) document.getElementById(toEnable[i]).disabled = false
}

function reenableFieldsImg() {
    const toEnable = ['postBody','postImgBtn','draftBtn','submitbutton']
    for (let i = 0; i < toEnable.length; i++) document.getElementById(toEnable[i]).disabled = false
}

function reenableSubtitleFields() {
    const toEnable = ['newLanguageField','chooseSubBtn','uploadSubBtn']
    for (let i = 0; i < toEnable.length; i++) document.getElementById(toEnable[i]).disabled = false
}

function postVideo() {
    let requiredFields = ['ipfshash','imghash','duration']
    let encodedVidInputs = ['video240p','video480p','video720p','video1080p']
    let respectiveField = ['ipfs240hash','ipfs480hash','ipfs720hash','ipfs1080hash']

    for (let i = 0; i < encodedVidInputs.length; i++) {
        if (document.getElementById(encodedVidInputs[i]).files.length != 0) requiredFields.push(respectiveField[i])
    }

    for (let j = 0; j < requiredFields.length; j++) {
        if (!postparams[requiredFields[j]]) return console.log('missing hash, not proceeding with broadcast')
    }

    let progressbarInner = document.getElementById('progressBarFront')

    if (Auth.dtconly == 'true') {
        if (config.noBroadcast) return
        broadcastAvalon(buildJsonMetadataAvalon(),postparams.ipfshash,() => {
            broadcastCompletion(true)
        })
        return
    }

    progressbarInner.innerHTML = 'Submitting video to Hive...'

    // Post to Hive blockchain
    let hiveTx = generatePost('hive')
    console.log('Hive tx',hiveTx)
    if (config.noBroadcast) return
    if (Auth.iskeychain == 'true') {
        // Broadcast with Keychain
        if (isElectron())
            hive.broadcast.send({ extensions: [], operations: hiveTx },[sessionStorage.getItem('hiveKey')],hiveBCb)
        else
            hive_keychain.requestBroadcast(username,hiveTx,'Posting',hiveBCb)
    } else {
        let hiveapi = new hivesigner.Client({ 
            accessToken: Auth.token,
            app: config.hivesignerApp,
            callbackURL: window.location.origin + '/upload',
            scope: ['comment','comment_options']
        })
        hiveapi.broadcast(hiveTx,(err) => {
            if (err) {
                return broadcastErrorHandler('HiveSigner',err.error_description)
            } else if (avalonUser) {
                // Broadcast to Avalon as well if Avalon login exists
                broadcastAvalon(buildJsonMetadataAvalon(),postparams.ipfshash,() => {
                    broadcastCompletion(true)
                })
            } else broadcastCompletion(false)
        })
    }
}

function hiveBCb(hiveResponse) {
    if (!isElectron() && hiveResponse.error)
        return broadcastErrorHandler('Hive Keychain',hiveResponse.message)
    else if (isElectron() && hiveResponse)
        return broadcastErrorHandler('Hive broadcast',hiveResponse.toString())

    // Avalon broadcast
    if (avalonUser)
        broadcastAvalon(buildJsonMetadataAvalon(),postparams.ipfshash,() => steemBroadcaster())
    else 
        steemBroadcaster()
}

function steemBCb(steemResponse) {
    if (!isElectron() && steemResponse.error) alert('Steem error: ' + steemResponse.message)
    else if (isElectron() && steemResponse) alert('Steem error: ' + steemResponse.toString())
    broadcastCompletion(avalonUser ? true : false)
}

function steemBroadcaster() {
    if (steemUser) {
        let steemTx = generatePost('steem')
        console.log('Steem tx',steemTx)
        document.getElementById('progressBarFront').innerHTML = 'Submitting video to Steem...'
        if (isElectron())
            steem.broadcast.send({ extensions: [], operations: steemTx },[sessionStorage.getItem('steemKey')],steemBCb)
        else
            steem_keychain.requestBroadcast(steemUser,steemTx,'Posting',steemBCb)
    } else broadcastCompletion(avalonUser ? true : false)
}

function broadcastErrorHandler(tool,e) {
    alert(tool+' error: '+e)
    document.getElementById('progressBarBack').style.display = "none"
    reenableFields()
}

function generatePermlink() {
    let permlink = ""
    let possible = "abcdefghijklmnopqrstuvwxyz0123456789"

    for (let i = 0; i < 8; i++) {
        permlink += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return permlink
}

function buildPostBody(author,permlink,postBody,videoHash,snapHash,description) {
    if (postBody == '') {
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://ipfs.io/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + description + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    } else {
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://ipfs.io/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + postBody + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    }
}

function buildJsonMetadata(network) {
    let jsonMeta = {
        video: buildJsonMetadataAvalon(),
        tags: postparams.tags,
        app: 'oneloveipfs/3',
    }

    jsonMeta.video.refs = generateRefs(network)

    return jsonMeta;
}

function buildJsonMetadataAvalon() {
    let jsonMeta = {
        files: {
            ipfs: {
                vid: {
                    src: postparams.ipfshash,
                    240: postparams.ipfs240hash,
                    480: postparams.ipfs480hash,
                    720: postparams.ipfs720hash,
                    1080: postparams.ipfs1080hash
                },
                img: {
                    118: postparams.imghash,
                    360: postparams.imghash,
                    spr: postparams.spritehash
                }
            }
        },
        dur: postparams.duration,
        title: postparams.title,
        desc: postparams.description,
        tag: postparams.tags[0],
        hide: 0,
        nsfw: 0,
        oc: 1,
        refs: generateRefs('avalon')
    }

    // Add Skylinks if applicable
    if (postparams.skylink || postparams.skylink240 || postparams.skylink480 || postparams.skylink720 || postparams.skylink1080) {
        jsonMeta.files.sia = {
            vid: {}
        }
    }
    if (postparams.skylink) jsonMeta.files.sia.vid.src = postparams.skylink
    if (postparams.skylink240) jsonMeta.files.sia.vid['240'] = postparams.skylink240
    if (postparams.skylink480) jsonMeta.files.sia.vid['480'] = postparams.skylink480
    if (postparams.skylink720) jsonMeta.files.sia.vid['720'] = postparams.skylink720
    if (postparams.skylink1080) jsonMeta.files.sia.vid['1080'] = postparams.skylink1080
    if (config.gateway) jsonMeta.files.ipfs.gw = config.gateway 

    if (subtitleList.length > 0) {
        jsonMeta.files.ipfs.sub = {}
        for (let i = 0; i < subtitleList.length; i++) {
            jsonMeta.files.ipfs.sub[subtitleList[i].lang] = subtitleList[i].hash
        }
    }

    return jsonMeta
}

function generateRefs(network) {
    let ref = []
    if (network !== 'avalon' && avalonUser)
        ref.push('dtc/' + avalonUser + '/' + postparams.ipfshash)
    if (network !== 'hive' && hiveDisplayUser)
        ref.push('hive/' + hiveDisplayUser + '/' + postparams.permlink)
    if (network !== 'steem' && steemUser)
        ref.push('steem/' + steemUser + '/' + postparams.permlink)
    if (network !== 'blurt' && blurtUser)
        ref.push('blurt/' + blurtUser + '/' + postparams.permlink)
    return ref
}

function generatePost(network) {
    // Power up all rewards or not
    let rewardPercent = postparams.powerup ? 0 : 10000
    let hmcExclude = false

    // Sort beneficiary list in ascending order
    let sortedBeneficiary = []
    if (network === 'hive')
        sortedBeneficiary = hiveBeneficiaries.sort()
    else if (network === 'steem')
        sortedBeneficiary = steemBeneficiaries.sort()
    else if (network === 'blurt') {
        sortedBeneficiary = blurtBeneficiaries.sort()
        hmcExclude = true
    }

    // Create transaction
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: !hmcExclude ? document.getElementById(network+'CommunitySelect').value : '',
                category: !hmcExclude ? document.getElementById(network+'CommunitySelect').value : '',
                author: username,
                permlink: postparams.permlink,
                title: postparams.title,
                body: buildPostBody(username,postparams.permlink,postparams.postBody,postparams.ipfshash,postparams.imghash,postparams.description),
                json_metadata: JSON.stringify(buildJsonMetadata(network)),
            }
        ],
        [ "comment_options", {
            author: username,
            permlink: postparams.permlink,
            max_accepted_payout: '1000000.000 HBD',
            percent_hbd: rewardPercent,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: []
        }]
    ]

    if (sortedBeneficiary.length > 0)
        operations[1][1].extensions.push([0, {
            beneficiaries: sortedBeneficiary
        }])

    if (network === 'steem') {
        operations[1][1].max_accepted_payout = '1000000.000 SBD'
        operations[1][1].percent_steem_dollars = rewardPercent
        delete operations[1][1].percent_hbd
    } else if (network === 'blurt') {
        operations[1][1].max_accepted_payout = '1000000.000 BLURT'
        delete operations[1][1].percent_hbd
        delete operations[0][1].category
    }

    return operations
}

async function broadcastAvalon(json,permlink,cb) {
    document.getElementById('progressBarFront').innerHTML = 'Submitting video to Avalon...'
    let tag = ''
    if (postparams.tags.length !== 0)
        tag = postparams.tags[0]
    
    let avalonGetAccPromise = new Promise((resolve,reject) => {
        javalon.getAccount(avalonUser,(err,user) => {
            if (err) return reject(err)
            resolve(user)
        })
    })

    let burnAmt = document.getElementById('dtcBurnInput').value ? Math.floor(parseFloat(document.getElementById('dtcBurnInput').value) * 100) : 0

    try {
        let avalonAcc = await avalonGetAccPromise
        let tx = {
            type: 4,
            data: {
                link: permlink,
                json: json,
                vt: Math.floor(javalon.votingPower(avalonAcc)*(document.getElementById('avalonvw').value)/100),
                tag: tag
            }
        }

        if (burnAmt > 0) {
            tx.type = 13
            tx.data.burn = burnAmt
        }

        let signedtx = javalon.sign(sessionStorage.getItem('avalonKey'),avalonAcc.name,tx)
        javalon.sendTransaction(signedtx,(err,result) => {
            if (err) alert('Avalon broadcast error: ' + JSON.stringify(err))
            cb()
        })
    } catch (e) {
        // Alert any Avalon errors after successful Hive tx broadcast then proceed to watch page as usual
        alert('Avalon broadcast error: ' + JSON.stringify(e))
        cb()
    }
}

function updateProgressBar(progress,text) {
    let progressbarInner = document.getElementById('progressBarFront')
    progressbarInner.style.width = progress + '%'
    progressbarInner.innerHTML = text + ' (' + progress + '%)'
}

function updateSubtitle() {
    if (subtitleList.length > 0)
        document.getElementById('subtitleHeading').style.display = 'block'
    let subtitleTableList = document.getElementById('subList')
    let subTableHtml = ''
    for (let i = 0; i < subtitleList.length; i++) {
        subTableHtml += '<tr>'
        subTableHtml += '<td class="subListLang">' + languages.getLanguageInfo(subtitleList[i].lang).name + '</td>'
        subTableHtml += '<td class="subListPrev"><a class="roundedBtn subPrevBtn" id="subPrevBtn' + i + '">Preview subtitle</a></td>'
        subTableHtml += '<td class="subListDel"><a class="roundedBtn subDelBtn" id="subDelBtn' + i + '">Remove</a></td>'
        subTableHtml += '</tr>'
    }
    subtitleTableList.innerHTML = subTableHtml

    let allSubtitlePrevBtnElems = document.querySelectorAll('a.subPrevBtn')
    
    for (let i = 0; i < allSubtitlePrevBtnElems.length; i++) {
        document.getElementById(allSubtitlePrevBtnElems[i].id).onclick = () => {
            window.open('https://ipfs.io/ipfs/' + subtitleList[i].hash,'name','width=600,height=400')
        }
    }

    let allSubtitleDelBtnElems = document.querySelectorAll('a.subDelBtn')

    for (let i = 0; i < allSubtitleDelBtnElems.length; i++) {
        document.getElementById(allSubtitleDelBtnElems[i].id).onclick = () => {
            subtitleList.splice(i,1)
            updateSubtitle()
        }
    }
}

function broadcastCompletion(isAvalonSuccess) {
    clearDraft()
    if (isAvalonSuccess) {
        if (isElectron())
            window.openBrowserWindowElectron('https://d.tube/v/' + avalonUser + '/' + postparams.ipfshash)
        else
            window.location.href = 'https://d.tube/v/' + avalonUser + '/' + postparams.ipfshash
    } else {
        if (isElectron())
            window.openBrowserWindowElectron('https://d.tube/v/' + username + '/' + postparams.permlink)
        else
            window.location.href = 'https://d.tube/v/' + username + '/' + postparams.permlink
    }
    if (isElectron())
        document.getElementById('progressBarFront').innerText = 'All done'
}

function clearDraft() {
    localStorage.setItem('OneLoveTitle','')
    localStorage.setItem('OneLoveDescription','')
    localStorage.setItem('OneLoveTags','')
    localStorage.setItem('OneLovePostBody','')
    localStorage.setItem('OneLoveSubtitles','')
    localStorage.setItem('DraftGraphenePermlink','')
    localStorage.setItem('DraftSteemBeneficiaries','[]')
    localStorage.setItem('DraftHiveBeneficiaries','[]')
    localStorage.setItem('DraftBlurtBeneficiaries','[]')
    localStorage.setItem('DraftSteemCommunity','')
    localStorage.setItem('DraftHiveCommunity','')
    localStorage.setItem('DraftPowerUp','false')
    localStorage.setItem('DraftSkynetUpload','false')
}

function estimatedBandwidth() {
    let bytes = 710 // base tx size including signatures

    // skynet uploads require more bytes for additional skylinks
    let skylinkBytes = 0
    if (document.getElementById('skynetupload').checked)
        skylinkBytes = 70

    // additional encoded versions require +55 bytes/res
    let encodedVidInputs = ['video240p','video480p','video720p','video1080p']
    for (let i = 0; i < encodedVidInputs.length; i++) {
        if (document.getElementById(encodedVidInputs[i]).files.length != 0) {
            bytes += 55
            if (skylinkBytes > 0) skylinkBytes += 55
        }
    }

    bytes += skylinkBytes

    // see which networks we are broadcasting to, assuming we are logged in with Avalon to be relevent
    let hasHive = dtconly != 'true'
    let hasSteem = steemUser ? true : false

    bytes += avalonUser.length // base + username length

    // tags
    let tag = document.getElementById('tags').value.split(' ')
    bytes += 2 * (tag[0].length)

    // refs
    if (hasHive)
        bytes += 16 + username.length
    if (hasSteem)
        bytes += 17 + steemUser.length
    if (hasHive && hasSteem)
        bytes += 1

    // other video metadata (e.g. duration, title, description)
    bytes += 11 // duration
    bytes += document.getElementById('title').value.length
    bytes += document.getElementById('description').value.length

    // vp and burn
    bytes += 10 // estimated 10 digit VP to be safe

    let burnAmt = document.getElementById('dtcBurnInput').value ? Math.floor(parseFloat(document.getElementById('dtcBurnInput').value) * 100) : 0
    if (burnAmt != 0)
        bytes += burnAmt.toString().length + 8

    return bytes
}

function needsBandwidth() {
    let currentBw = javalon.bandwidth({ bw: window.availableAvalonBw, balance: availableForBurn * 100 })
    if (currentBw > estimatedBandwidth())
        return false
    else
        return estimatedBandwidth() - currentBw
}

async function getCommunitySubs(acc,network) {
    let communities, node
    switch (network) {
        case 'hive':
            node = 'https://techcoderx.com'
            break
        case 'steem':
            node = 'https://api.steemit.com'
            break
    }
    try {
        communities = await axios.post(node,{
            jsonrpc: '2.0',
            method: 'bridge.list_all_subscriptions',
            params: { account: acc },
            id: 1
        })
    } catch { return }
    let selection = document.getElementById(network+'CommunitySelect')
    for (let i = 0; i < communities.data.result.length; i++) if (communities.data.result[i][0] !== 'hive-134220') {
        let newoption = document.createElement('option')
        newoption.text = communities.data.result[i][1] + ' (' + communities.data.result[i][0] + ')'
        newoption.value = communities.data.result[i][0]
        selection.appendChild(newoption)
    }
    let savedCommunity = localStorage.getItem('Draft' + capitalizeFirstLetter(network) + 'Community')
    if (savedCommunity)
        document.getElementById(network+'CommunitySelect').value = savedCommunity
}