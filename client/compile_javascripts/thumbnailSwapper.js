let username
const Auth = require('./auth')
const jAvalon = require('javalon')
Auth.steem().then((result) => {
    username = result
})

// Load Avalon login
let avalonUser = sessionStorage.getItem('OneLoveAvalonUser')
let avalonKey = sessionStorage.getItem('OneLoveAvalonKey')

let steemPostToModify
let avalonPostToModify
let selectedAuthor
let selectedPermlink
let chainSource

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modeBtn').onclick = () => {
        let uploader = document.getElementById('uploadForm')
        let thumbnailSwapper = document.getElementById('thumbnailSwapper')
        let modeSwitchBtn = document.getElementById('modeBtn')
    
        if (uploader.style.display == 'none') {
            uploader.style.display = 'block'
            thumbnailSwapper.style.display = 'none'
            modeSwitchBtn.innerHTML = 'New Upload'
    
        } else {
            uploader.style.display = 'none'
            thumbnailSwapper.style.display = 'block'
            modeSwitchBtn.innerHTML = 'Thumbnail Swap'
        }
    }

    document.getElementById('linkSubmitBtn').onclick = () => {
        let linkInput = document.getElementById('thumbnailSwapLink')
        if (!linkInput.value.startsWith('https://d.tube/#!/v/') && !linkInput.value.startsWith('https://d.tube/v/'))
            return alert('Link provided is not a valid d.tube video link.')
        let split = linkInput.value.replace('/#!','').replace('https://d.tube/v/','').split('/')
        if (split.length != 2)
            return alert('Link provided is an invalid d.tube video link format.')
        if (split[0] !== username && split[0] !== avalonUser)
            return alert('DTube video selected is not your video!')
        async.parallel({
            steem: (cb) => {
                steem.api.getContent(split[0],split[1],(err,res) => {
                    if (err) return cb(err)
                    cb(null,res)
                })
            },
            avalon: (cb) => {
                jAvalon.getContent(split[0],split[1],(err,res) => {
                    if (err) return cb(err)
                    cb(null,res)
                })
            }
        },(errors,results) => {
            console.log(results)
            let noAvalonWarningShown = document.getElementById('thumbnailSwapNoAvalon').style.display
            if (results.avalon === undefined && results.steem && results.steem.author === split[0] && results.steem.permlink === split[1] && results.steem.json_metadata !== "") {
                // Valid Steem link
                if (results.steem.author !== username)
                    return alert('DTube video selected is not your video!')
                let jsonmeta = JSON.parse(results.steem.json_metadata)
                if (!jsonmeta.video)
                    return alert('Link provided is actually not a DTube video!')

                chainSource = 'steem'

                if (jsonmeta.video.info) {
                    // DTube 0.7 / 0.8
                    steemPostToModify = results.steem
                    selectedAuthor = split[0]
                    selectedPermlink = split[1]
                    noAvalonWarningShown = 'none'

                    document.getElementById('currentSnap').innerHTML = '<img class="snapImgPreview" src="https://snap1.d.tube/ipfs/' + jsonmeta.video.info.snaphash + '">'
                    let resultHTMLToAppend2 = '<h4>Title: ' + results.steem.title + '<br><br>'
                    resultHTMLToAppend2 += 'Permlink: ' + split[1] + '<br><br>'
                    resultHTMLToAppend2 += 'Current thumbnail hash: ' + jsonmeta.video.info.snaphash + '</h4>'
                    document.getElementById('videoInfo').innerHTML = HtmlSanitizer.SanitizeHtml(resultHTMLToAppend2)
                    document.getElementById('newSnapField').style.display = 'block'
                    document.getElementById('swapSubmitBtn').style.display = 'block'
                } else if (jsonmeta.video.providerName !== 'IPFS') {
                    // DTube 0.9+ non-IPFS uploads
                    return alert('DTube video selected must be an IPFS upload.')
                } else if (jsonmeta.video.ipfs) {
                    // DTube 0.9+ IPFS uploads
                    steemPostToModify = results.steem
                    selectedAuthor = split[0]
                    selectedPermlink = split[1]

                    if (!avalonUser || !avalonKey) noAvalonWarningShown = 'block'

                    document.getElementById('currentSnap').innerHTML = '<img class="snapImgPreview" src="https://snap1.d.tube/ipfs/' + jsonmeta.video.ipfs.snaphash + '">'
                    let resultHTMLToAppend2 = '<h4>Title: ' + results.steem.title + '<br><br>'
                    resultHTMLToAppend2 += 'Permlink: ' + split[1] + '<br><br>'
                    resultHTMLToAppend2 += 'Current thumbnail hash: ' + jsonmeta.video.ipfs.snaphash + '</h4>'
                    document.getElementById('videoInfo').innerHTML = HtmlSanitizer.SanitizeHtml(resultHTMLToAppend2)
                    document.getElementById('newSnapField').style.display = 'block'
                    document.getElementById('swapSubmitBtn').style.display = 'block'
                } else {
                    return alert('Failed to retrieve DTube video info.')
                }
            } else if (results.avalon && results.avalon.json) {
                // Valid Avalon link (DTube 0.9+)
                if (results.avalon.json.providerName !== 'IPFS')
                    return alert('DTube video selected must be an IPFS upload.')

                avalonPostToModify = results.avalon
                selectedAuthor = split[0]
                selectedPermlink = split[1]
                chainSource = 'dtc'

                if (!avalonUser || !avalonKey) noAvalonWarningShown = 'block'

                document.getElementById('currentSnap').innerHTML = '<img class="snapImgPreview" src="https://snap1.d.tube/ipfs/' + results.avalon.json.ipfs.snaphash + '">'
                let resultHTMLToAppend2 = '<h4>Title: ' + results.avalon.json.title + '<br><br>'
                resultHTMLToAppend2 += 'Permlink: ' + split[1] + '<br><br>'
                resultHTMLToAppend2 += 'Current thumbnail hash: ' + results.avalon.json.ipfs.snaphash + '</h4>'
                document.getElementById('videoInfo').innerHTML = HtmlSanitizer.SanitizeHtml(resultHTMLToAppend2)
                document.getElementById('newSnapField').style.display = 'block'
                document.getElementById('swapSubmitBtn').style.display = 'block'
            } else if (errors) {
                // Error handling
                if (errors.steem)
                    return alert('Error retrieving video info from Steem: ' + errors.steem)
                else if (errors.avalon == 'SyntaxError: Unexpected token N in JSON at position 0')
                    return alert('Invalid link provided.')
                else if (errors.avalon)
                    return alert('Error retrieving video info from Avalon: ' + errors.avalon)
                else
                    return alert('Unknown error while retrieving video info.')
            } else {
                return alert('Unknown error while retrieving video info.')
            }
        })
    }

    document.getElementById('swapSubmitBtn').onclick = () => {
        if (!steemPostToModify)
            return alert('No video selected for thumbnail swap.')

        let newSnap = document.getElementById('newSnap').files
        if (newSnap.length == 0)
            return alert('Please upload a new replacement thumbnail!')

        let snapFormData = new FormData()
        snapFormData.append('image',newSnap[0])

        document.getElementById('linkSubmitBtn').disabled = true
        document.getElementById('thumbnailSwapLink').disabled = true
        document.getElementById('newSnap').disabled = true
        document.getElementById('swapSubmitBtn').disabled = true
        
        let contentType = {
            headers: {
                "content-type": "multipart/form-data"
            }
        }

        let call = '/uploadImage?type=thumbnails&access_token=' + Auth.token
        if (Auth.iskeychain !== 'true')
            call += '&scauth=true'
        axios.post(call,snapFormData,contentType).then(function(response) {
            let newSnapHash = response.data.imghash

            // Edit json_metadata
            let jsonmeta = JSON.parse(steemPostToModify.json_metadata)
            jsonmeta.video.info.snaphash = newSnapHash
            jsonmeta.app = 'onelovedtube/0.9'
            console.log(jsonmeta)

            // Edit Steem article body
            let oldSnapLink = steemPostToModify.body.match(/\bhttps?:\/\/\S+/gi)[1].replace('\'></a></center><hr>','')
            let editedBody = steemPostToModify.body.replace(oldSnapLink,'https://cloudflare-ipfs.com/ipfs/' + newSnapHash)
            console.log(editedBody)

            let tx = [
                [ 'comment', {
                        parent_author: steemPostToModify.parent_author,
                        parent_permlink: steemPostToModify.parent_permlink,
                        author: steemPostToModify.author,
                        permlink: steemPostToModify.permlink,
                        title: steemPostToModify.title,
                        body: editedBody,
                        json_metadata: JSON.stringify(jsonmeta),
                    }
                ]
            ]

            if (Auth.iskeychain === 'true') {
                // Broadcast with Steem Keychain
                steem_keychain.requestBroadcast(username,tx,'Posting',(response) => {
                    if (response.error) {
                        alert('Failed to update thumbnail on Steem: ' + response.error + '\n\nThe IPFS hash of your new thumbnail is ' + newSnapHash)
                        reenableSnapSwapFields()
                    } else {
                        alert('Thumbnail has been updated successfully! Click OK to view your updated post on Steemit with your new thumbnail!\n\nIf you need to remove your old thumbnail from our server to reclaim your disk usage, please contact us with your old hash that you want us to remove: ' + oldSnapLink.split('/ipfs/')[1])
                        window.location.assign('https://steemit.com/@' + selectedAuthor + '/' + selectedPermlink)
                    }
                })
            } else {
                // Broadcast with SteemConnect
                let api2 = new steemconnect.Client({ accessToken: Auth.token })
                api2.broadcast(tx,(error) => {
                    if (error) {
                        alert('Failed to update thumbnail on Steem: ' + response.error + '\n\nThe IPFS hash of your new thumbnail is ' + newSnapHash)
                        reenableSnapSwapFields()
                    } else {
                        alert('Thumbnail has been updated successfully! Click OK to view your updated post on Steemit with your new thumbnail!\n\nIf you need to remove your old thumbnail from our servers to reclaim your disk usage, please contact us with your old hash that you want us to remove: ' + oldSnapLink.split('/ipfs/')[1])
                        window.location.assign('https://steemit.com/@' + selectedAuthor + '/' + selectedPermlink)
                    }
                })
            }
            reenableSnapSwapFields()
        }).catch(function(err) {
            if (err.response.data.error)
                alert('Upload error: ' + err.response.data.error)
            else
                alert('Upload error: ' + err)
            reenableSnapSwapFields()
        })
    }
})

function reenableSnapSwapFields() {
    const toEnable = ['linkSubmitBtn','thumbnailSwapLink','newSnap','swapSubmitBtn']
    for (let i = 0; i < toEnable.length; i++) document.getElementById(toEnable[i]).disabled = false
}