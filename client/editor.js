// cross-platform video metadata editor
const hiveFrontends = [
    'https://hive.blog',
    'https://peakd.com',
    'https://ecency.com',
    'https://hive.ausbit.dev',
    'https://hiveblocks.com'
]

const blurtFrontends = [
    'https://blurt.blog',
    'https://blurt.live',
    'https://blurtlatam.com'
]

const dtubeLinks = [
    'https://d.tube',
    'https://dtube.on.fleek.co'
]

const threespeakUri = '/watch/hive:'
const threespeakUrl = 'https://3speak.tv/watch?v='

let editor = {
    editingPosts: {},
    editingPlatforms: [],
    refs: [],
    params: {}
}

function onEditLinkSubmit() {
    let link = document.getElementById('thumbnailSwapLink').value
    let linkType = ''
    let authorLink = ''
    for (let f in hiveFrontends)
        if (link.startsWith(hiveFrontends[f]))
            linkType = 'hive'
    if (!linkType)
        for (let f in blurtFrontends)
            if (link.startsWith(blurtFrontends[f]))
                linkType = 'blurt'
    if (!linkType)
        for (let f in dtubeLinks)
            if (link.startsWith(dtubeLinks[f]))
                linkType = 'dtube'
    if (!linkType)
        if (link.startsWith(threespeakUri) || link.startsWith(threespeakUrl))
            linkType = '3speak'
    if (!linkType)
        return alert('Invalid link')
    switch (linkType) {
        case 'hive':
        case 'blurt':
            let s = link.split('@')
            if (s.length !== 2)
                return alert('Invalid '+linkType+' link')
            authorLink = s[1]
            break
        case 'dtube':
            if (!link.includes('/v/'))
                return alert('Invalid dtube link')
            authorLink = link.split('/v/')[1]
            break
        case '3speak':
            let lk = link.startsWith(threespeakUrl) ? link.replace(threespeakUrl,'').split('/') : link.replace(threespeakUri,'').split(':')
            if (lk.length !== 2)
                return alert('Invalid 3speak link')
            authorLink = lk.join('/')
            break
        default:
            return alert('Unknown link ?!')
    }
    
    editor.editingPosts = {}
    // normalize network
    if (linkType === '3speak')
        linkType = 'hive'
    
    // auth check
    if (linkType === 'hive' && !hiveDisplayUser)
        return alert('Not logged in with hive')
    else if (linkType === 'blurt' && !blurtUser)
        return alert('Not logged in with blurt')
    else if (linkType === 'dtube' && !dtcDisplayUser)
        return alert('Not logged in with avalon')

    // video owner check
    let authorLinkSplit = authorLink.split('/')
    if ((linkType === 'hive' && authorLinkSplit[0] !== hiveDisplayUser) ||
        (linkType === 'blurt' && authorLinkSplit[0] !== blurtUser) ||
        (linkType === 'dtube' && authorLinkSplit[0] !== dtcDisplayUser))
        return alert('Not your video to edit')

    editor.params = {}
    editor.editingPlatforms = []
    editor.editingPosts = {}

    editorFetchContent(linkType, authorLinkSplit[0], authorLinkSplit[1])
}

function onEditSubmit() {
    let newTitle = document.getElementById('editTitle').value
    let newTags = document.getElementById('editTags').value
    let newThumbnail = document.getElementById('metaEditImg').files

    if (newTitle.length > 256)
        return alert('New title is too long!')

    if (/^[a-z0-9- _]*$/.test(newTags) == false)
        return alert('Invalid new tags!')

    let tags = newTags.split(' ')
    if ((Object.keys(editor.editingPosts).length > 1 || !editor.editingPosts.avalon) && tags.length > 10)
        return alert('Please do not use more than 10 tags!')

    if (editor.editingPlatforms.includes('3Speak')) {
        if (!isElectron())
            return alert('Editing of 3Speak videos can only be done on desktop app as the 3Speak API is not available in webapp.')
        if (!spkGetSavedCookie())
            return alert('Please authenticate with 3Speak API in 3Speak Uploads page first.')
        else if (spkGetIdxByPermlink(editor.editingPosts.hive.permlink) === -1)
            return alert('Could not find video from 3Speak db?!?!')
    }

    if (newThumbnail.length > 0 && !editor.editingPlatforms.includes('3Speak')) {
        let formdata = new FormData()
        formdata.append('image',newThumbnail[0])
        updateDisplayByIDs(['uploadProgressBack'],[])
        updateProgressBar(0,'Uploading thumbnail...')

        uploadThumbnail('thumbnails',formdata,() => {
            if (!res.data || !res.data.imghash)
                return alert('Could not obtain new thumbnail hash from upload')
            finalizeEdit(res.data.imghash)
        },() => updateDisplayByIDs([],['uploadProgressBack']))
    } else
        finalizeEdit()
}

async function finalizeEdit(newThumbnailHash) {
    let newTitle = document.getElementById('editTitle').value
    let newDesc = document.getElementById('editDescription').value
    let newTags = document.getElementById('editTags').value
    updateDisplayByIDs(['uploadProgressBack'],[])
    updateProgressBar(100,'Finalizing edits...')

    for (let n in editor.editingPosts)
        try {
            if (n === 'hive' || n === 'blurt')
                editor.editingPosts[n].title = newTitle
            if (n === 'hive')
                newThumbnailHash = await editorFinalize3Speak(newTitle,newDesc,newTags)
            editorFinalizeDTube(n,newTitle,newDesc,newTags,newThumbnailHash)
        } catch (e) {
            alert('Failed to update json metadata with new values. See logs for details.')
            console.log(e)
            return
        }

    for (let n in editor.editingPosts) {
        let success = false
        if (n === 'hive' || n === 'blurt') {
            let tx = [
                ['comment', {
                    parent_author: editor.editingPosts[n].parent_author,
                    parent_permlink: editor.editingPosts[n].parent_permlink,
                    author: editor.editingPosts[n].author,
                    permlink: editor.editingPosts[n].permlink,
                    title: editor.editingPosts[n].title,
                    body: editor.editingPosts[n].body,
                    json_metadata: editor.editingPosts[n].json_metadata,
                }]
            ]
            if (n === 'hive')
                success = await editorBroadcastPromise((cb) => hiveBroadcast(tx,cb))
            else if (n === 'blurt')
                success = await editorBroadcastPromise((cb) => blurtBroadcaster(tx,cb))
        } else if (n === 'avalon') {
            success = await editorBroadcastPromise((cb) => avalonBroadcast({
                type: 28,
                data: {
                    link: editor.editingPosts[n].link,
                    json: editor.editingPosts[n].json
                },
                sender: editor.editingPosts[n].author,
                ts: new Date().getTime()
            },cb))
        }
        if (!success)
            return
    }
    editor = {
        editingPosts: {},
        editingPlatforms: [],
        refs: [],
        params: {}
    }
    updateDisplayByIDs(['metaEditSuccess'],['linkResult'])
}

function editorBroadcastPromise(fx) {
    return new Promise((rs) => fx((r) => rs(r)))
}

function editorFinalizeDTube(network,newTitle,newDesc,newTags,newThumbnailHash) {
    if (!editor.editingPlatforms.includes('DTube')) return
    if (!editor.editingPosts[network]) return
    if (!allowedPlatformNetworks['DTube'].includes(network)) return
    let tags = newTags.split(' ')
    let json = {}

    switch (network) {
        case 'hive':
        case 'blurt':
            json = JSON.parse(editor.editingPosts[network].json_metadata)
            if (newThumbnailHash) {
                json.video.files.ipfs.img[118] = newThumbnailHash
                json.video.files.ipfs.img[360] = newThumbnailHash
                json.video.thumbnailUrl = getPreferredIPFSGw(true)+'/ipfs/'+newThumbnailHash
            }
            json.video.title = newTitle
            json.video.desc = newDesc
            json.video.tag = tags[0]
            json.tags = tags
            editor.editingPosts[network].json_metadata = JSON.stringify(json)
            break
        case 'avalon':
            json = editor.editingPosts.avalon.json
            if (newThumbnailHash) {
                json.files.ipfs.img[118] = newThumbnailHash
                json.files.ipfs.img[360] = newThumbnailHash
                json.thumbnailUrl = getPreferredIPFSGw(true)+'/ipfs/'+newThumbnailHash
            }
            json.title = newTitle
            json.desc = newDesc
            editor.editingPosts.avalon.json = json
            break
    }
}

async function editorFinalize3Speak(newTitle,newDesc,newTags) {
    let json = JSON.parse(editor.editingPosts.hive.json_metadata)
    let tags = newTags.split(' ')
    let thumbnailId = await editorUploadSPKThumbnail()
    let idx = spkGetIdxByPermlink(editor.editingPosts.hive.permlink)
    idx = await editorUpdateSPKDetailPromise(idx,newTitle,newDesc,tags,spkUploadList[idx].nsfw,thumbnailId)
    console.log(thumbnailId,idx)
    if (!editor.editingPlatforms.includes('3Speak')) return
    if (!editor.editingPosts.hive) return
    for (let s in json.video.info.sourceMap)
        if (json.video.info.sourceMap[s].type === 'thumbnail')
            json.video.info.sourceMap[s].url = spkUploadList[idx].thumbnail
    json.video.info.title = newTitle
    json.video.content.description = newDesc
    json.video.content.tags = tags
    json.tags = tags
    editor.editingPosts.hive.json_metadata = JSON.stringify(json)
}

function editorUploadSPKThumbnail() {
    return new Promise((rs,rj) => {
        let t = document.getElementById('metaEditImg').files
        if (t.length > 0) {
            window.postMessage({ action: 'spk_thumbnail_upload', data: { cookie: spkGetSavedCookie(), thumbnailPath: t[0].path }})
            let thumbnailError = new BroadcastChannel('spk_thumbnail_upload_error')
            let thumbnailResult = new BroadcastChannel('spk_thumbnail_upload_result')
            thumbnailError.onmessage = evt => {
                thumbnailError.close()
                thumbnailResult.close()
                rj(evt.data)
            }
            thumbnailResult.onmessage = evt => {
                thumbnailError.close()
                thumbnailResult.close()
                rs(evt.data)
            }
        } else
            rs(null)
    })
}

function editorUpdateSPKDetailPromise(idx,title,desc,tags,nsfw,thumbnailId) {
    return new Promise((rs) => spkUpdateDraft(spkGetSavedCookie(),idx,title,desc,tags,nsfw,thumbnailId,(newIdx) => rs(newIdx)))
}

function editorFetchContent(linkType, author, link, ref) {
    // fetch
    if (linkType === 'hive' || linkType === 'blurt')
        getGrapheneContent(linkType, author, link).then((content) => {
            console.log(content)
            if (!content || !content.author || !content.permlink) return
            editor.editingPosts[linkType] = content
            editorJsonCheck(linkType, typeof ref !== 'undefined')
        }).catch((e) => {
            console.log(e)
            alert('Failed to fetch '+linkType+' post, see browser console for details')
        })
    else if (linkType === 'dtube' || linkType === 'dtc')
        getAvalonContent(author,link).then((content) => {
            editor.editingPosts.avalon = content
            editorJsonCheck('avalon', typeof ref !== 'undefined')
        }).catch((e) => {
            console.log(e)
            alert('Failed to fetch avalon content, see browser console for details')
        })
}

// json metadata check up to 1 refs deep
// editable metadata: title, description, tags (graphene chains only) and thumbnails only
function editorJsonCheck(network, isRef = false) {
    let json = {}
    let refs = []
    if (network === 'hive' || network === 'blurt') {
        try {
            json = JSON.parse(editor.editingPosts[network].json_metadata)
        } catch {
            if (!isRef)
                return alert('Failed to parse JSON metadata of '+network+' post')
        }
    } else if (network === 'avalon')
        json = editor.editingPosts[network].json
    console.log(network,json)

    if (network === 'hive' &&
        json.type === '3speak/video' &&
        Array.isArray(json.tags) &&
        json.video && json.video.info &&
        Array.isArray(json.video.info.sourceMap) &&
        json.video.content && json.video.info.platform === '3speak' &&
        json.video.info.author === editor.editingPosts[network].author &&
        json.video.info.permlink === editor.editingPosts[network].permlink &&
        !editor.editingPlatforms.includes('3Speak')) {
        editor.editingPlatforms.push('3Speak')
        if (!isRef) {
            editor.params.title = json.video.info.title
            editor.params.description = json.video.content.description
            editor.params.tags = json.tags
            for (let s in json.video.info.sourceMap) {
                if (json.video.info.sourceMap[s].type === 'thumbnail') {
                    editor.params.imghash = json.video.info.sourceMap[s].url.replace('ipfs://','').replace('https://ipfs-3speak.b-cdn.net/ipfs/','')
                    break
                }
            }
        }
    }
    
    // dtube 1.0+ on hive/blurt
    if ((network === 'hive' || network === 'blurt') &&
        json.video && json.video.files &&
        !editor.editingPlatforms.includes('DTube')) {
        editor.editingPlatforms.push('DTube')
        if (Array.isArray(json.video.refs))
            refs = json.video.refs
    } else if (network === 'avalon' &&
        json.files &&
        !editor.editingPlatforms.includes('DTube')) {
        editor.editingPlatforms.push('DTube')
        if (Array.isArray(json.refs))
            refs = json.refs
    }
    if (editor.editingPlatforms.indexOf('DTube') === 0) {
        if (network === 'avalon') {
            editor.params.title = json.title
            editor.params.description = json.desc
            editor.params.imghash = json.thumbnailURL || json.files.ipfs ? (json.files.ipfs.img ? (json.files.ipfs.img[360] || json.files.ipfs.img[118]) : '') : ''
        } else {
            editor.params.title = json.video.title
            editor.params.description = json.video.desc
            editor.params.imghash = json.video.thumbnailURL || json.video.files.ipfs ? (json.video.files.ipfs.img ? (json.video.files.ipfs.img[360] || json.video.files.ipfs.img[118]) : '') : ''
        }
    }

    if (!isRef && editor.editingPlatforms.length === 0)
        return alert('Link is not a video posted to supported platforms')
    else
        editor.editingPosts[network].parsed = true

    // load refs
    if (!isRef) {
        for (let r in refs) if (typeof refs[r] === 'string') {
            let refSplit = refs[r].split('/')
            if (refSplit.length !== 3)
                continue
            editorFetchContent(refSplit[0],refSplit[1],refSplit[2],network)
        }
        document.getElementById('editTitle').value = editor.params.title
        document.getElementById('editDescription').value = editor.params.description
        if (Array.isArray(editor.params.tags))
            document.getElementById('editTags').value = editor.params.tags.join(' ')
        else
            updateDisplayByIDs([],['editTagsField'])
        let thumbUrl = ''
        if (typeof editor.params.imghash === 'string' && editor.params.imghash.startsWith('http'))
            thumbUrl = editor.params.imghash
        else
            thumbUrl = 'https://ipfs.io/ipfs/'+editor.params.imghash
        document.getElementById('metaEditOldImg').setAttribute('src',thumbUrl)
        updateDisplayByIDs(['linkResult'],['metaEditIntro'])
    } else
        editor.refs.push(network)

    document.getElementById('editPlatforms').innerText = 'Editing on '+ listWords(editor.editingPlatforms)
}

function chooseReplacementThumbnail() {
    document.getElementById('metaEditImg').click()
}

function selectReplacementThumbnail() {
    let thumbs = document.getElementById('metaEditImg').files
    if (thumbs.length === 0)
        return updateDisplayByIDs([],['metaEditThumbNew'])
    let img = document.createElement('img')
    img.src = URL.createObjectURL(thumbs[0])
    document.getElementById('metaEditThumbNewImg').innerHTML = ''
    document.getElementById('metaEditThumbNewImg').appendChild(img)

    let a = document.createElement('a')
    a.onclick = () => {
        document.getElementById('metaEditImg').value = ''
        updateDisplayByIDs([],['metaEditThumbNew'])
    }
    let removeText = document.createElement('p')
    removeText.innerText = 'Remove'
    a.setAttribute('class','metaEditOverlay')
    a.appendChild(removeText)
    document.getElementById('metaEditThumbNewImg').appendChild(a)
    updateDisplayByIDs(['metaEditThumbNew'],[])
}