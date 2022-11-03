// Load auth details
let username

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
let scheduleDatePicker

// Socket.io connection to server
let uplStat
axios.get('/proxy_server').then((r) => {
    uplStat = io.connect(r.data.server+'/uploadStat')
    uplStat.on('begin',(s) => {
        console.log('begin',s)
        switch (s.step) {
            case 'encode':
                let encodeProgressBars = []
                document.getElementById('uploadProgressFront').innerText = 'Encoding HLS video...'
                for (let r in s.outputs) {
                    // create encoding progress bar elements
                    let back = document.createElement('div')
                    back.setAttribute('class','progressBack')
                    back.setAttribute('id','encodeProgressBack'+s.outputs[r])
                    let front = document.createElement('div')
                    front.setAttribute('class','progressFront')
                    front.setAttribute('id','encodeProgressFront'+s.outputs[r])
                    back.appendChild(front)
                    document.getElementById('encodeProgress').appendChild(document.createElement('br'))
                    document.getElementById('encodeProgress').appendChild(back)

                    // setup progress
                    encodeProgressBars.push('encodeProgressBack'+s.outputs[r])
                    document.getElementById('encodeProgressFront'+s.outputs[r]).innerText = 'Encoding to '+s.outputs[r]+'... (0%)'
                }
                updateDisplayByIDs(encodeProgressBars,[])
                break
            case 'container':
                document.getElementById('encodeProgress').innerHTML = ''
                document.getElementById('uploadProgressFront').innerText = 'Processing output container...'
                break
            case 'ipfsadd':
                document.getElementById('uploadProgressFront').innerText = 'Adding to IPFS...'
                break
            default:
                break
        }
    })
    uplStat.on('progress',(p) => {
        console.log('progress',p)
        switch (p.job) {
            case 'encode':
                document.getElementById('encodeProgressFront'+p.resolution).style.width = p.progress+'%'
                document.getElementById('encodeProgressFront'+p.resolution).innerText = 'Encoding to '+p.resolution+'... ('+Math.round(p.progress)+'%)'
                break
            case 'ipfsadd':
                document.getElementById('uploadProgressFront').innerText = 'Adding to IPFS... ('+p.progress+' of '+p.total+' files)'
                break
            default:
                break
        }
    })
    uplStat.on('error',(e) => {
        console.log('upload processing error',e)
        alert(e.error)
        updateDisplayByIDs([],['uploadProgressBack'])
        reenableFields()
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
    let avalonAcc = await Auth.Avalon()
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
            return
        }

        // Beneficiaries description text
        let beneficiariesGrapheneList = []
        if (hiveDisplayUser) beneficiariesGrapheneList.push('HIVE')
        if (steemUser) beneficiariesGrapheneList.push('STEEM')
        if (blurtUser) beneficiariesGrapheneList.push('BLURT')
        let beneficiariesGrapheneListText = ''
        if (beneficiariesGrapheneList.length > 2)
            beneficiariesGrapheneListText += beneficiariesGrapheneList.slice(0,-1).join(', ') + ' or ' + beneficiariesGrapheneList[beneficiariesGrapheneList.length-1]
        else
            beneficiariesGrapheneListText = beneficiariesGrapheneList.join(' or ')
        let beneficiariesDescText = 'Add some accounts here to automatically receive a portion of your '+beneficiariesGrapheneListText+' post rewards.'
        if (avalonUser)
            beneficiariesDescText += ' Avalon beneficiaries are set in blockchain config such that @dtube receives 10% of DTUBE curation rewards.'
        document.getElementById('beneficiariesDesc').innerText = beneficiariesDescText

        if (config.olisc)
            updateDisplayByIDs(['schedulepost','scheduledStr'],[])

        if (isPlatformSelected.DTube && config.skynetEnabled)
            updateDisplayByIDs(['skynetswitch'],[])

        // Hide Avalon first curated tag info if not logged in with Avalon
        if (!avalonUser || (!avalonKey && (!avalonKc || !avalonKcUser))) {
            updateDisplayByIDs([],['tagInfo1'])
        } else {
            if (avalonAcc) {
                document.getElementById('dtcBurnInput').placeholder = 'Available: ' + thousandSeperator(avalonAcc.balance / 100) + ' DTUBE'
                document.getElementById('avalonvwlabel').innerText = 'Avalon vote weight: 1% (~' + thousandSeperator(Math.floor(0.01 * getAvalonVP(avalonAcc))) + ' VP)'
                window.availableForBurn = avalonAcc.balance / 100
                window.availableAvalonBw = avalonAcc.bw
                window.availableAvalonVP = avalonAcc.vt
                loadAvalonAuthorityStatus(avalonAcc)
            }
            if (!hiveDisplayUser) {
                document.getElementById('tagLbl').innerText = 'Tag:'
                updateDisplayByIDs([],['tagInfo1'])
            }
        }

        for (let g in grapheneNetworks)
            if (usernameByNetwork(grapheneNetworks[g]))
                getGrapheneAccounts(grapheneNetworks[g],[usernameByNetwork(grapheneNetworks[g])]).then((acc) => {
                    loadGrapheneAuthorityStatus(acc[0],grapheneNetworks[g])
                    getCommunitySubs(acc[0].name,grapheneNetworks[g])
                }).catch(() => {})
            else
                updateDisplayByIDs([],['beneficiaryHeading'+capitalizeFirstLetter(grapheneNetworks[g]),'beneficiaryTableList'+capitalizeFirstLetter(grapheneNetworks[g]),'totalBeneficiariesLabel'+capitalizeFirstLetter(grapheneNetworks[g]),grapheneNetworks[g]+'Community'])
    })

    // TODO: Display warning if resumable uploads is unavailable
    if (tus.isSupported) {
        console.log('tus is supported')
    } else {
        console.log('tus is not supported')
    }

    loadOliscDatePicker()
    document.getElementById('languages').innerHTML = langOptions
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

        postparams.scheduled = validateDatePicker()
        if (postparams.scheduled === -1) return

        // Auth.restrict()

        // Upload thumbnail
        let formdata = new FormData()
        formdata.append('image',snap[0])

        updateDisplayByIDs(['uploadProgressBack'],[])
        updateProgressBar(0,'Uploading thumbnail...')

        let contentType = {
            headers: {
                "Content-Type": "multipart/form-data"
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
                updateDisplayByIDs([],['uploadProgressBack'])
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
            updateDisplayByIDs([],['uploadProgressBack'])
            reenableFields()
        })
    }

    document.getElementById('avalonvw').oninput = () => {
        let avalonVW = document.getElementById('avalonvw').value
        document.getElementById('avalonvwlabel').innerText = 'Avalon vote weight: ' + avalonVW + '% (~' + thousandSeperator(Math.floor(avalonVW/100 * getAvalonVP({vt: window.availableAvalonVP, balance: window.availableForBurn * 100}))) + ' VP)'
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
        toggleImg(true)

        updateDisplayByIDs(['uploadProgressBack'],[])
        document.getElementById('uploadProgressFront').innerHTML = "Uploading... (0%)";

        let contentType = {
            headers: {
                "Content-Type": "multipart/form-data"
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
            updateDisplayByIDs([],['uploadProgressBack'])
            document.getElementById('postBody').value += ('\n![' + document.getElementById('postImg').value.replace(/.*[\/\\]/, '') + ']('+config.gateway+'/ipfs/' + response.data.imghash + ')');
            toggleImg(false)
        }).catch(function(err) {
            if (err.response.data.error)
                alert('Upload error: ' + err.response.data.error)
            else
                alert('Upload error: ' + err);
            updateDisplayByIDs([],['uploadProgressBack'])
            toggleImg(false)
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

        toggleElems(['newLanguageField','chooseSubBtn','uploadSubBtn'],true)

        const contentType = {
            headers: {
                "Content-Type": "text/plain"
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
            toggleElems(['newLanguageField','chooseSubBtn','uploadSubBtn'],false)
            updateSubtitle()
        }).catch((err) => {
            toggleElems(['newLanguageField','chooseSubBtn','uploadSubBtn'],false)
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
            Hive: hiveBeneficiaries,
            Steem: steemBeneficiaries,
            Blurt: blurtBeneficiaries
        }

        for (let n in nobj) if (network === 'All' || network === n) getGrapheneAccounts(n.toLowerCase(),[account]).then((result) => {
            if (result.length === 0) return alert('Beneficiary account specified doesn\'t exist on '+n)

            try {
                nobj[n].addAccount(account,percentage)
            } catch (e) {
                return alert(e)
            }
        }).catch((e) => alert('Error while validating '+n+' account: ' + e))
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

function updateTab(tab) {
    const tabNames = ['basics','subtitles','advanced']
    updateDisplayByIDs([tab],tabNames)
    for (let i in tabNames)
        document.getElementById('tab'+capitalizeFirstLetter(tabNames[i])).style.backgroundColor = "transparent"
    document.getElementById('tab'+capitalizeFirstLetter(tab)).style.backgroundColor = "#2196F3"
}

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
    let fInputElemName, resolutionFType, progressTxt
    let lbl = ['source','240','480','720','1080']
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
        case 2:
        case 3:
        case 4:
            fInputElemName = `video${lbl[resolution]}p`
            resolutionFType = `video${lbl[resolution]}`
            progressTxt = `Uploading ${lbl[resolution]}p video...`
            break
        default:
            return next()
    }

    let videoToUpload = document.getElementById(fInputElemName).files
    if (videoToUpload.length < 1) return uploadVideo(resolution+1,next)

    updateDisplayByIDs(['uploadProgressBack'],[])
    let progressbarInner = document.getElementById('uploadProgressFront')

    if (config.uploadFromFs && isElectron()) {
        progressbarInner.innerText = 'Submitting upload...'
        return axios.post('/uploadVideoFs'+geturl,{
            type: resolutionFType,
            createSprite: isPlatformSelected['DTube'] ? 'true' : '',
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
        parallelUploads: getMobileOperatingSystem() === 'iOS' ? 1 : (parseInt(usersettings.uplThreads) || 10),
        headers: {
            'Authorization': 'Bearer '+window.btoa(JSON.stringify({keychain: Auth.iskeychain === 'true'})).replace(/={1,2}$/, '')+'.'+Auth.token,
        },
        metadata: {
            type: resolutionFType,
            createSprite: isPlatformSelected['DTube'] ? 'true' : '',
            skynet: document.getElementById('skynetupload').checked ? 'true' : 'false'
        },
        onError: (e) => {
            console.log('tus error',e)
            try {
                let errorres = JSON.parse(e.originalResponse._xhr.responseText)
                if (errorres.error)
                    alert(errorres.error)
                else
                    alert(e.originalResponse._xhr.responseText)
            } catch {
                alert('Unknown Tus error')
            }
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

function toggleImg(disable = false) {
    toggleElems(['postBody','postImgBtn','draftBtn','submitbutton'],disable)
}

function reenableFields() {
    toggleElems(['sourcevideo','snapfile','title','description','tags','powerup','postBody','postImgBtn','draftBtn','submitbutton','newLanguageField','chooseSubBtn','uploadSubBtn','linkSubmitBtn','swapSubmitBtn'],false)
}

function postVideo() {
    let requiredFields = ['ipfshash','imghash','duration']
    let encodedVidInputs = ['video240p','video480p','video720p','video1080p']
    let respectiveField = ['ipfs240hash','ipfs480hash','ipfs720hash','ipfs1080hash']

    for (let i = 0; i < encodedVidInputs.length; i++)
        if (document.getElementById(encodedVidInputs[i]).files.length > 0) requiredFields.push(respectiveField[i])

    for (let j = 0; j < requiredFields.length; j++)
        if (!postparams[requiredFields[j]]) return console.log('missing hash, not proceeding with broadcast')

    if (postparams.scheduled)
        document.getElementById('uploadProgressFront').innerHTML = 'Scheduling broadcasts...'

    hiveBroadcast()
}

async function grapheneSignAndBroadcast(network,wif,ops) {
    let api = getBlockchainAPI(network,true)
    let tx = new hiveTx.Transaction(hivecryptpro.sha256,null,CHAIN_IDS[network])
    await tx.create(ops,300,api)
    let buf = tx.serialize()
    let sig = hivecryptpro.Signature.create(buf,wif).customToString()
    tx.appendSignature(sig)
    return await tx.broadcast(api)
}

function hiveKeychainSignBufferPromize(user,message,role) {
    return new Promise((rs) => hive_keychain.requestSignBuffer(user,message,role,rs))
}

// Series broadcast
function hiveBroadcast(hiveTx = null, serial = true) {
    if (!hiveTx)
        hiveTx = generatePost('hive')
    console.log('Hive tx',hiveTx)
    if (!hiveDisplayUser || supportedPlatforms.hive.filter((p) => isPlatformSelected[p]).length === 0 || config.noBroadcast)
        return hiveCb({},serial)

    if (serial && postparams.scheduled)
        return olisc.new(hiveTx,'hive',postparams.scheduled).then(() => hiveCb({},serial)).catch((e) => hiveCb({error: axiosErrorMessage(e)},serial))

    document.getElementById('uploadProgressFront').innerHTML = 'Submitting video to Hive...'

    if (Auth.iskeychain == 'true') {
        // Broadcast with Keychain
        if (hiveAuthLogin)
            hiveauth.broadcast(hiveAuthLogin,'posting',hiveTx,() => document.getElementById('uploadProgressFront').innerText = 'Approve Hive transaction in HiveAuth PKSA')
                .then(() => hiveCb({},serial))
                .catch((e) => {
                    let em = ''
                    if (e.toString() === 'Error: expired')
                        em = 'HiveAuth broadcast request expired'
                    else if (e.cmd === 'sign_nack')
                        em = 'HiveAuth broadcast request rejected'
                    else if (e.cmd === 'sign_err')
                        em = e.error
                    hiveCb({error: em},serial)
                })
        else if (isElectron())
            grapheneSignAndBroadcast('hive',sessionStorage.getItem('hiveKey'),hiveTx)
                .then((r) => hiveCb(r,serial))
                .catch((e) => hiveCb({error: e.toString()},serial))
        else
            hive_keychain.requestBroadcast(username,hiveTx,'Posting',(r) => hiveCb(r,serial))
    } else {
        let hiveapi = new hivesigner.Client({ 
            accessToken: Auth.token,
            app: config.hivesignerApp,
            callbackURL: window.location.origin + '/upload',
            scope: ['comment','comment_options']
        })
        hiveapi.broadcast(hiveTx,(err) => hiveCb({error: err.error_description},serial))
    }
}

function hiveCb(r,serial) {
    if (r.error) {
        bcError('Hive broadcast',r.error.toString())
        if (typeof serial === 'function')
            serial(false)
        return
    }

    if (typeof serial === 'boolean' && serial === true)
        avalonBroadcast()
    else if (typeof serial === 'function')
        serial(true)
}

async function avalonBroadcast(tx = null, serial = true) {
    if (!dtcDisplayUser || supportedPlatforms.avalon.filter((p) => isPlatformSelected[p]).length === 0 || config.noBroadcast)
        return avalonCb(null,serial)

    if (!postparams.scheduled)
        document.getElementById('uploadProgressFront').innerHTML = 'Submitting video to Avalon...'
    let tag = ''
    if (postparams.tags.length !== 0)
        tag = postparams.tags[0]

    let burnAmt = document.getElementById('dtcBurnInput').value ? Math.floor(parseFloat(document.getElementById('dtcBurnInput').value) * 100) : 0

    try {
        if (!tx) {
            let avalonAcc = await getAvalonAccount(avalonUser)
            tx = {
                type: 4,
                data: {
                    link: postparams.ipfshash,
                    json: buildJsonMetadataAvalon(),
                    vt: Math.floor(getAvalonVP(avalonAcc)*(document.getElementById('avalonvw').value)/100),
                    tag: tag
                },
                sender: avalonAcc.name,
                ts: new Date().getTime()
            }

            if (burnAmt > 0) {
                tx.type = 13
                tx.data.burn = burnAmt
            }
        }
        console.log('Avalon tx',tx)
        if (serial && postparams.scheduled)
            return olisc.new(tx,'avalon',postparams.scheduled).then(() => avalonCb(null,serial)).catch((e) => avalonCb(axiosErrorMessage(e),serial))
        let stringifiedRawTx = JSON.stringify(tx)
        let h = hivecryptpro.sha256(stringifiedRawTx)
        tx.hash = h.toString('hex')
        if (avalonKc && avalonKcUser) {
            let hiveKcSign = await hiveKeychainSignBufferPromize(avalonKcUser,stringifiedRawTx,avalonKc)
            if (hiveKcSign.error)
                return avalonCb(hiveKcSign.message,serial)
            tx.signature = [hivecryptpro.Signature.fromString(hiveKcSign.result).toAvalonSignature()]
        } else
            tx.signature = [hivecryptpro.Signature.avalonCreate(h,sessionStorage.getItem('avalonKey')).toAvalonSignature()]

        await broadcastAvalonTx(tx)
        avalonCb(null,serial)
    } catch (e) {
        avalonCb(e.toString(),serial)
    }
}

function avalonCb(e,serial) {
    if (e) {
        bcError('Avalon broadcast',e)
        if (typeof serial === 'function')
            serial(false)
        return
    }

    if (typeof serial === 'boolean' && serial === true)
        steemBroadcaster()
    else if (typeof serial === 'function')
        serial(true)
}

function steemBroadcaster(serial = true) {
    if (steemUser && supportedPlatforms.steem.filter((p) => isPlatformSelected[p]).length > 0 && !config.noBroadcast) {
        let steemTx = generatePost('steem')
        console.log('Steem tx',steemTx)
        document.getElementById('uploadProgressFront').innerHTML = 'Submitting video to Steem...'
        if (isElectron())
            grapheneSignAndBroadcast('steem',sessionStorage.getItem('steemKey'),steemTx)
                .then((r) => steemCb(r,serial))
                .catch((e) => steemCb({error: e.toString()},serial))
        else
            steem_keychain.requestBroadcast(steemUser,steemTx,'Posting',(r) => steemCb(r,serial))
    } else steemCb({},serial)
}

function steemCb(r,serial) {
    if (r.error) {
        bcError('Steem broadcast',r.error.toString())
        if (typeof serial === 'function')
            serial(false)
        return
    }

    if (typeof serial === 'boolean' && serial === true)
        blurtBroadcaster()
    else if (typeof serial === 'function')
        serial(true)
}

function blurtBroadcaster(blurtTx = null, serial = true) {
    if (blurtUser && supportedPlatforms.blurt.filter((p) => isPlatformSelected[p]).length > 0 && !config.noBroadcast) {
        if (!blurtTx)
            blurtTx = generatePost('blurt')
        console.log('Blurt tx',blurtTx)
        if (postparams.scheduled)
            return olisc.new(blurtTx,'blurt',postparams.scheduled).then(() => blurtCb({},serial)).catch((e) => blurtCb({error: axiosErrorMessage(e)},serial))
        document.getElementById('uploadProgressFront').innerHTML = 'Submitting video to Blurt...'
        if (isElectron())
            grapheneSignAndBroadcast('blurt',sessionStorage.getItem('blurtKey'),blurtTx)
                .then((r) => blurtCb(r,serial))
                .catch((e) => blurtCb({error: e.toString()},serial))
        else
            blurt_keychain.requestBroadcast(blurtUser,blurtTx,'Posting',(r) => blurtCb(r,serial))
    } else blurtCb({},serial)
}

function blurtCb(r,serial) {
    if (r.error) {
        bcError('Blurt broadcast',r.error.toString())
        if (typeof serial === 'function')
            serial(false)
        return
    }

    if (typeof serial === 'boolean' && serial === true)
        bcFinish()
    else if (typeof serial === 'function')
        serial(true)
}

function bcError(tool,e) {
    alert(tool+' error: '+e)
    document.getElementById('uploadProgressBack').style.display = "none"
    reenableFields()
}

function bcFinish() {
    document.getElementById('uploadProgressFront').style.width = '100%'
    document.getElementById('uploadProgressFront').innerHTML = 'All done'
    if (!postparams.scheduled) {
        postpublish()
        updateDisplayByIDs(['postpublish'],['uploadForm','thumbnailSwapper','yourFiles','wcinfo','refiller','getHelp','settings','scheduledPublishes'])
    }
}

function generatePermlink() {
    let permlink = ""
    let possible = "abcdefghijklmnopqrstuvwxyz0123456789"

    for (let i = 0; i < 8; i++) {
        permlink += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return permlink
}

function postThumbnailByPlatform(network) {
    let pf = pfPostEmbed(network)
    switch (pf) {
        case '3Speak':
            return '<center>[![]('+config.gateway+'/ipfs/'+postparams.imghash+')](https://3speak.tv/watch?v='+usernameByNetwork(network)+'/'+postparams.permlink+')</center><hr>'
        case 'DTube':
            return '<center><a href=\'https://d.tube/#!/v/'+usernameByNetwork(network)+'/'+postparams.permlink+'\'><img src=\''+config.gateway+'/ipfs/'+postparams.imghash+'\'></a></center><hr>'
    }
}

function buildPostBody(network) {
    let result = postThumbnailByPlatform(network)+'\n\n'
    result += postparams.postBody ? postparams.postBody : postparams.description
    result += '\n\n<hr>\n'
    if (isPlatformSelected['3Speak'])
        result += '\n[▶️ 3Speak Dapp](https://3speak.tv/openDapp?uri=hive:'+usernameByNetwork(network)+':'+postparams.permlink+')'
    if (isPlatformSelected['DTube'])
        result += '\n[▶️ DTube](https://d.tube/#!/v/'+usernameByNetwork(network)+'/'+postparams.permlink+')'
    result += '\n[▶️ IPFS]('+config.gateway+'/ipfs/'+postparams.ipfshash+')'
    if (postparams.skylink)
        result += '\n[▶️ Skynet](https://siasky.net/'+postparams.skylink+')'
    return result
}

function buildJsonMetadata(network) {
    let jsonMeta = {
        video: {},
        tags: postparams.tags,
        app: 'oneloveipfs/3',
    }

    if (isPlatformSelected.DTube && allowedPlatformNetworks.DTube.includes(network)) {
        let dtubeJson = buildJsonMetadataAvalon()
        for (let k in dtubeJson)
            jsonMeta.video[k] = dtubeJson[k]
        jsonMeta.video.refs = generateRefs(network)
    }

    if (isPlatformSelected['3Speak'] && allowedPlatformNetworks['3Speak'].includes(network)) {
        // Desktop app format
        /*
        jsonMeta.title = postparams.title
        jsonMeta.description = postparams.description
        jsonMeta.sourceMap = [
            ...(postparams.hasThumbnail ? [{
                type: 'thumbnail',
                url: 'ipfs://'+postparams.imghash
            }] : []),
            {
                type: 'video',
                url: 'ipfs://'+postparams.ipfshash+'/default.m3u8',
                format: 'm3u8'
            }
        ]
        jsonMeta.image = ['https://ipfs-3speak.b-cdn.net/ipfs/'+postparams.imghash]
        jsonMeta.filesize = postparams.size
        jsonMeta.created = new Date().toISOString()
        jsonMeta.type = '3speak/video'
        jsonMeta.video.duration = postparams.duration
        jsonMeta.video.info = {
            author: usernameByNetwork(network),
            permlink: postparams.permlink
        }
        */
        // 3speak.tv format
        jsonMeta.type = '3speak/video'
        jsonMeta.image = ['https://ipfs-3speak.b-cdn.net/ipfs/'+postparams.imghash]
        jsonMeta.video.info = {
            author: usernameByNetwork(network),
            permlink: postparams.permlink,
            platform: '3speak',
            title: postparams.title,
            duration: postparams.duration,
            filesize: postparams.size,
            lang: 'en', // todo add lang field
            firstUpload: false,
            video_v2: 'https://ipfs-3speak.b-cdn.net/ipfs/'+postparams.ipfshash+'/default.m3u8', // from mobile app, not sure what is this for
            ipfs: postparams.ipfshash+'/default.m3u8',
            ipfsThumbnail: postparams.imghash
        }
        jsonMeta.sourceMap = [
            ...(postparams.hasThumbnail ? [{
                type: 'thumbnail',
                url: 'ipfs://'+postparams.imghash
            }] : []),
            {
                type: 'video',
                url: 'ipfs://'+postparams.ipfshash+'/default.m3u8',
                format: 'm3u8'
            }
        ]
        jsonMeta.video.content = {
            description: postparams.description,
            tags: postparams.tags
        }
    }

    return jsonMeta
}

function buildJsonMetadataAvalon() {
    let defaultRes = [240,480,720,1080]
    let jsonMeta = {
        files: {
            ipfs: {
                vid: {},
                img: {
                    118: postparams.imghash,
                    360: postparams.imghash,
                    spr: postparams.spritehash
                }
            }
        },
        thumbnailUrl: config.gateway+'/ipfs/'+postparams.imghash,
        dur: postparams.duration,
        title: postparams.title,
        desc: postparams.description,
        tag: postparams.tags[0],
        hide: 0,
        nsfw: 0,
        oc: 1,
        refs: generateRefs('avalon')
    }

    if (postparams.type === 'hls') {
        for (let r in postparams.resolutions)
            jsonMeta.files.ipfs.vid[postparams.resolutions[r]] = postparams.ipfshash+'/'+postparams.resolutions[r]+'p/index.m3u8'
        jsonMeta.files.ipfs.vid.src = postparams.ipfshash+'/'+postparams.resolutions[postparams.resolutions.length-1]+'p/index.m3u8'
    } else {
        jsonMeta.files.ipfs.vid.src = postparams.ipfshash
        for (let r in defaultRes)
            if (postparams['ipfs'+defaultRes[r]+'hash'])
                jsonMeta.files.ipfs.vid[defaultRes[r]] = postparams['ipfs'+defaultRes[r]+'hash']
    }

    // Add Skylinks if applicable
    if (postparams.skylink || postparams.skylink240 || postparams.skylink480 || postparams.skylink720 || postparams.skylink1080) {
        jsonMeta.files.sia = {
            vid: {}
        }
        if (postparams.skylink) jsonMeta.files.sia.vid.src = postparams.skylink
        for (let r in defaultRes)
            if (postparams['skylink'+defaultRes[r]])
                jsonMeta.files.sia.vid[defaultRes[r]] = postparams['skylink'+defaultRes[r]]
    }
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

    // Sort beneficiary list in ascending order
    let sortedBeneficiary = []
    if (network === 'hive')
        sortedBeneficiary = hiveBeneficiaries.sort()
    else if (network === 'steem')
        sortedBeneficiary = steemBeneficiaries.sort()
    else if (network === 'blurt')
        sortedBeneficiary = blurtBeneficiaries.sort()
    let user = usernameByNetwork(network)

    let commentOptions = [
        "comment_options", {
            author: user,
            permlink: postparams.permlink,
            max_accepted_payout: '1000000.000 HBD',
            percent_hbd: rewardPercent,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: []
        }
    ]

    if (sortedBeneficiary.length > 0)
        commentOptions[1].extensions.push([0, {
            beneficiaries: sortedBeneficiary
        }])

    // Create transaction
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: document.getElementById(network+'CommunitySelect').value,
                category: document.getElementById(network+'CommunitySelect').value,
                author: user,
                permlink: postparams.permlink,
                title: postparams.title,
                body: buildPostBody(network),
                json_metadata: JSON.stringify(buildJsonMetadata(network)),
            }
        ]
    ]

    if (sortedBeneficiary.length > 0 || rewardPercent < 10000) {
        operations.push(commentOptions)
        if (network === 'steem') {
            operations[1][1].max_accepted_payout = '1000000.000 SBD'
            operations[1][1].percent_steem_dollars = rewardPercent
            delete operations[1][1].percent_hbd
        } else if (network === 'blurt') {
            operations[1][1].max_accepted_payout = '1000000.000 BLURT'
            delete operations[1][1].percent_hbd
            delete operations[0][1].category
        }
    }

    if (isPlatformSelected['3Speak'] && allowedPlatformNetworks['3Speak'].includes(network))
        operations.push(['custom_json', {
            required_auths: [],
            required_posting_auths: [user],
            id: '3speak-publish',
            json: JSON.stringify({
                author: user,
                permlink: postparams.permlink,
                category: 'general',
                language: 'en',
                duration: postparams.duration,
                title: postparams.title
            })
        }])

    return operations
}

function updateProgressBar(progress,text) {
    let progressbarInner = document.getElementById('uploadProgressFront')
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
            window.open(config.gateway+'/ipfs/' + subtitleList[i].hash,'name','width=600,height=400')
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

async function getCommunitySubs(acc,network) {
    let communities
    try {
        communities = await axios.post(getBlockchainAPI(network),{
            jsonrpc: '2.0',
            method: 'bridge.list_all_subscriptions',
            params: { account: acc },
            id: 1
        })
    } catch { return }
    let selection = document.getElementById(network+'CommunitySelect')
    for (let i = 0; i < communities.data.result.length; i++) if (communities.data.result[i][0] !== getDefaultCommunity(network)) {
        let newoption = document.createElement('option')
        newoption.text = communities.data.result[i][1] + ' (' + communities.data.result[i][0] + ')'
        newoption.value = communities.data.result[i][0]
        selection.appendChild(newoption)
    }
    let savedCommunity = localStorage.getItem('Draft' + capitalizeFirstLetter(network) + 'Community')
    if (savedCommunity)
        document.getElementById(network+'CommunitySelect').value = savedCommunity
}

function getDefaultCommunity(network) {
    if (network === 'blurt')
        return 'blurt-134220'
    else
        return 'hive-134220'
}