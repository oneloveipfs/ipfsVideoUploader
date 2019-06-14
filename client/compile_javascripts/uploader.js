// Load auth details
let username
const Auth = require('./auth')
const jAvalon = require('javalon')
Auth.steem().then((result) => {
    username = result
    Auth.avalon()
})

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
let savedSubtitles = JSON.parse(localStorage.getItem('OneLoveSubtitles'))
if (savedSubtitles) {
    subtitleList = savedSubtitles
    setTimeout(() => updateSubtitle(),250)
}

document.addEventListener('DOMContentLoaded', () => {
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

    document.getElementById('submitbutton').onclick = () => {
        // Validate data entered
        let postBody = document.getElementById('postBody').value
        let description = document.getElementById('description').value
        let powerup = document.getElementById('powerup').checked
        let permlink = generatePermlink()

        let sourceVideo = document.getElementById('sourcevideo').files
        let snap = document.getElementById('snapfile').files

        let video240 = document.getElementById('video240p').files
        let video480 = document.getElementById('video480p').files
        let video720 = document.getElementById('video720p').files
        let video1080 = document.getElementById('video1080p').files

        let title = document.getElementById('title').value
        if (title.length > 256)
            return alert('Title is too long!')

        let tag = document.getElementById('tags').value
        if (/^[a-z0-9- _]*$/.test(tag) == false)
            return alert('Invalid tags!')

        let tags = tag.split(' ')
        if (tags.length > 4)
            return alert('Please do not use more than 4 tags!')

        // Check for empty fields
        if (sourceVideo.length == 0)
            return alert('Please upload a video!')

        if (snap.length == 0)
            return alert('Please upload a thumbnail for your video!')

        if (title.length == 0)
            return alert('Please enter a title!')

        if (tag.length == 0)
            return alert('Please enter some tags (up to 4) for your video!')

        Auth.restrict()

        // Upload video
        let formdata = new FormData()
        formdata.append('VideoUpload',sourceVideo[0])
        formdata.append('SnapUpload',snap[0])

        if (video240.length > 0)
            formdata.append('Video240Upload',video240[0])
        if (video480.length > 0)
            formdata.append('Video480Upload',video480[0])
        if (video720.length > 0)
            formdata.append('Video720Upload',video720[0])
        if (video1080.length > 0)
            formdata.append('Video1080Upload',video1080[0])

        let progressbar = document.getElementById('progressBarBack')
        let progressbarInner = document.getElementById('progressBarFront')
        progressbar.style.display = "block"
        progressbarInner.innerHTML = "Uploading... (0%)"

        let contentType = {
            headers: {
                "content-type": "multipart/form-data"
            },
            onUploadProgress: function (progressEvent) {
                console.log(progressEvent)

                let progressPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                updateProgressBar(progressPercent)
            }
        }

        let call = '/uploadVideo?access_token=' + Auth.token
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

            progressbarInner.innerHTML = 'Submitting video to Steem blockchain...'

            // Post to Steem blockchain
            let transaction = generatePost(username,permlink,postBody,uploaderResponse.ipfshash,uploaderResponse.snaphash,uploaderResponse.spritehash,uploaderResponse.ipfs240hash,uploaderResponse.ipfs480hash,uploaderResponse.ipfs720hash,uploaderResponse.ipfs1080hash,title,description,tags,uploaderResponse.duration,uploaderResponse.filesize,powerup,uploaderResponse.dtubefees);
            if (Auth.iskeychain == 'true') {
                // Broadcast with Keychain
                steem_keychain.requestBroadcast(username,transaction,'Posting',(response) => {
                    if (response.error != null) {
                        alert('Failed to post on DTube: ' + response.error + '\n\nHere are the details of the upload for your reference:\nIPFS hash: ' + uploaderResponse.ipfshash + '\nThumbnail hash: ' + uploaderResponse.snaphash + '\nSprite hash: ' + uploaderResponse.spritehash + '\nVideo duration: ' + uploaderResponse.duration + '\nVideo filesize: ' + uploaderResponse.filesize);
                        progressbar.style.display = "none";
                        reenableFields();
                    } else if (sessionStorage.getItem('OneLoveAvalonUser') !== null) {
                        // Broadcast to Avalon as well if Avalon login exists
                        let avalontag = ''
                        if (tags.length !== 0)
                            avalontag = tags[0]
                        progressbarInner.innerHTML = 'Submitting video to Avalon blockchain...'
                        broadcastAvalon(buildJsonMetadataAvalon(uploaderResponse.ipfshash,uploaderResponse.snaphash,uploaderResponse.spriteHash,uploaderResponse.ipfs240hash,uploaderResponse.ipfs480hash,uploaderResponse.ipfs720hash,uploaderResponse.ipfs1080hash,title,description,uploaderResponse.duration,uploaderResponse.filesize),avalontag,uploaderResponse.ipfshash,() =>  {
                            localStorage.clear()
                            window.location.replace('https://d.tube/v/' + username + '/' + permlink)
                        })
                    } else {
                        // If Avalon login not found, redirect to d.tube watch page right away
                        localStorage.clear()
                        window.location.replace('https://d.tube/v/' + username + '/' + permlink)
                    }
                })
            } else {
                // Broadcast with SteemConnect
                let api = new steemconnect.Client({ accessToken: Auth.token })
                api.broadcast(transaction,function(err) {
                    if (err != null) {
                        alert('Failed to post on DTube: ' + err + '\n\nHere are the details of the upload for your reference:\nIPFS hash: ' + uploaderResponse.ipfshash + '\nThumbnail hash: ' + uploaderResponse.snaphash + '\nSprite hash: ' + uploaderResponse.spritehash + '\nVideo duration: ' + uploaderResponse.duration + '\nVideo filesize: ' + uploaderResponse.filesize);
                        progressbar.style.display = "none";
                        reenableFields();
                    } else if (sessionStorage.getItem('OneLoveAvalonUser') !== null) {
                        // Broadcast to Avalon as well if Avalon login exists
                        let avalontag = ''
                        if (tags.length !== 0)
                            avalontag = tags[0]
                        progressbarInner.innerHTML = 'Submitting video to Avalon blockchain...'
                        broadcastAvalon(buildJsonMetadataAvalon(uploaderResponse.ipfshash,uploaderResponse.snaphash,uploaderResponse.spriteHash,uploaderResponse.ipfs240hash,uploaderResponse.ipfs480hash,uploaderResponse.ipfs720hash,uploaderResponse.ipfs1080hash,title,description,uploaderResponse.duration,uploaderResponse.filesize),avalontag,uploaderResponse.ipfshash,() =>  {
                            localStorage.clear()
                            window.location.replace('https://d.tube/v/' + username + '/' + permlink)
                        })
                    } else {
                        localStorage.clear();
                        window.location.replace('https://d.tube/v/' + username + '/' + permlink);
                    }
                });
            }
        }).catch(function(err) {
            if (err.response.data.error)
                alert('Upload error: ' + err.response.data.error)
            else
                alert('Upload error: ' + err);
            progressbar.style.display = "none";
            reenableFields();
        });
    }

    document.getElementById('avalonvw').oninput = () => {
        let avalonVW = document.getElementById('avalonvw').value
        document.getElementById('avalonvwlabel').innerText = 'Avalon vote weight: ' + avalonVW + '%'
        if (avalonVW > 10)
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
                console.log(progressEvent);

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
            document.getElementById('postBody').value += ('\n![' + document.getElementById('postImg').value.replace(/.*[\/\\]/, '') + '](https://cloudflare-ipfs.com/ipfs/' + response.data.imghash + ')');
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

    // Drafts
    document.getElementById('draftBtn').onclick = () => {
        localStorage.setItem('OneLoveTitle',document.getElementById('title').value)
        localStorage.setItem('OneLoveDescription',document.getElementById('description').value)
        localStorage.setItem('OneLoveTags',document.getElementById('tags').value)
        localStorage.setItem('OneLovePostBody',document.getElementById('postBody').value)
        localStorage.setItem('OneLoveSubtitles',JSON.stringify(subtitleList))
        alert('Metadata saved as draft!')
    }
})

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
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://cloudflare-ipfs.com/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + description + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    } else {
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://cloudflare-ipfs.com/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + postBody + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    }
}

function buildJsonMetadata(sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,DTubeTags,duration,filesize,author,permlink) {
    // TODO: Update json_metadata for dtube 0.9+ for Steem + SCOT
    // 'dtube' tag as first tag for Steemit post
    let SteemTags = ['dtube']
    SteemTags = SteemTags.concat(DTubeTags);

    let jsonMeta = {
        video: {
            info: {
                title: title,
                snaphash: snapHash,
                author: author,
                permlink: permlink,
                duration: duration,
                filesize: filesize,
                spritehash: spriteHash,
                provider: 'onelovedtube/0.9',
            },
            content: {
                videohash: sourceHash,
                video240hash: video240Hash,
                video480hash: video480Hash,
                video720hash: video720Hash,
                video1080hash: video1080Hash,
                description: description,
                tags: DTubeTags,
            },
        },
        tags: SteemTags,
        app: 'onelovedtube/0.9',
    }

    if (subtitleList.length > 0)
        jsonMeta.video.content.subtitles = subtitleList

    return jsonMeta;
}

function buildJsonMetadataAvalon(sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,duration,filesize) {
    let jsonMeta = {
        videoId: sourceHash,
        duration: duration,
        title: title,
        description: description,
        filesize: filesize,
        ipfs: {
            snaphash: snapHash,
            spritehash: spriteHash,
            videohash: sourceHash,
            video240hash: video240Hash,
            video480hash: video480Hash,
            video720hash: video720Hash,
            video1080hash: video1080Hash
        },
        thumbnailUrl: 'https://snap1.d.tube/ipfs/' + snapHash,
        providerName: 'IPFS'
    }

    if (subtitleList.length > 0)
        jsonMeta.ipfs.subtitles = subtitleList

    return jsonMeta
}

function generatePost(username,permlink,postBody,sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,tags,duration,filesize,powerUp,dtubefees) {
    // Power up all rewards or not
    let percentSBD = 10000
    if (powerUp == true) {
        percentSBD = 0
    }

    // Create transaction to post on Steem blockchain
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: 'dtube',
                author: username,
                permlink: permlink,
                title: title,
                body: buildPostBody(username,permlink,postBody,sourceHash,snapHash,description),
                json_metadata: JSON.stringify(buildJsonMetadata(sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,tags,duration,filesize,username,permlink)),
            }
        ],
        [ "comment_options", {
            author: username,
            permlink: permlink,
            max_accepted_payout: '1000000.000 SBD',
            percent_steem_dollars: percentSBD,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [
                [0, {
                    beneficiaries: [{
                        account: 'dtube',
                        weight: dtubefees
                    }]
                }]
            ]
        }]
    ]
    return operations
}

async function broadcastAvalon(json,tag,permlink,cb) {
    let avalonGetAccPromise = new Promise((resolve,reject) => {
        jAvalon.getAccount(sessionStorage.getItem('OneLoveAvalonUser'),(err,user) => {
            if (err) return reject(err)
            resolve(user)
        })
    })

    try {
        let avalonAcc = await avalonGetAccPromise
        let tx = {
            type: 4,
            data: {
                link: permlink,
                json: json,
                vt: Math.floor(jAvalon.votingPower(avalonAcc)*(document.getElementById('avalonvw').value)/100),
                tag: tag
            }
        }
        let signedtx = jAvalon.sign(sessionStorage.getItem('OneLoveAvalonKey'),avalonAcc.name,tx)
        jAvalon.sendTransaction(signedtx,(err,result) => {
            if (err) alert('Steem broadcast successful however there is an error with Avalon: ' + err)
            cb()
        })
    } catch (e) {
        // Alert any Avalon errors after successful Steem tx broadcast then proceed to watch page as usual
        alert('Steem broadcast successful however there is an error with Avalon: ' + e)
        cb()
    }
}

function updateProgressBar(progress) {
    let progressbarInner = document.getElementById('progressBarFront')
    progressbarInner.style.width = progress + '%'
    progressbarInner.innerHTML = 'Uploading... (' + progress + '%)'
}

function updateSubtitle() {
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
            window.open('https://cloudflare-ipfs.com/ipfs/' + subtitleList[i].hash,'name','width=600,height=400')
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