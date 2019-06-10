let username
const Auth = require('./auth')
Auth.steem().then((result) => {
    username = result
})

let steemPostToModify
let selectedAuthor
let selectedPermlink

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
        if (split[0] !== username)
            return alert('DTube video selected is not your video!')
        steem.api.getContent(split[0],split[1],(err,result) => {
            if (err) return document.getElementById('linkResult').innerHTML = '<h4>Steem error: ' + err + '</h4>'
            console.log(result)
            let jsonmeta = JSON.parse(result.json_metadata)
            if (!jsonmeta.video)
                return alert('Link provided is actually not a DTube video!')
            if (!jsonmeta.video.info)
                return alert('Failed to retrieve DTube video info.')

            steemPostToModify = result
            selectedAuthor = split[0]
            selectedPermlink = split[1]
            
            document.getElementById('currentSnap').innerHTML = '<img class="snapImgPreview" src="https://snap1.d.tube/ipfs/' + jsonmeta.video.info.snaphash + '">'
            let resultHTMLToAppend2 = '<h4>Title: ' + result.title + '<br><br>'
            resultHTMLToAppend2 += 'Permlink: ' + split[1] + '<br><br>'
            resultHTMLToAppend2 += 'Current thumbnail hash: ' + jsonmeta.video.info.snaphash + '</h4>'
            document.getElementById('videoInfo').innerHTML = HtmlSanitizer.SanitizeHtml(resultHTMLToAppend2)
            document.getElementById('newSnapField').style.display = 'block'
            document.getElementById('swapSubmitBtn').style.display = 'block'
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
            jsonmeta.app = 'onelovedtube/0.8.5'
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
                let api2 = steemconnect.Client({ accessToken: Auth.token })
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