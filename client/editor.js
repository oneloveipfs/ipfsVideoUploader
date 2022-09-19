// cross-platform video metadata editor
const hiveFrontends = [
    'https://hive.blog',
    'https://peakd.com',
    'https://ecency.com',
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

let editor = {
    editingPosts: {},
    editingPlatforms: [],
    steemIgnored: false,
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
        if (link.startsWith(threespeakUri))
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
            let lk = link.replace(threespeakUri,'').split(':')
            if (lk.length !== 2)
                return alert('Invalid 3speak link')
            authorLink = lk.replace(':','/')
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
    else if (linkType === 'steem')
        editor.steemIgnored = true
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

    // support 3speak edits posted using oneloveipfs or desktop app only,
    // NOT 3speak.tv until we get to publish there without @threespeak posting auth
    if (network === 'hive' &&
        json.type === '3speak/video' &&
        Array.isArray(json.tags) &&
        json.video && json.video.info &&
        (Array.isArray(json.sourceMap) || (json.video.content && json.video.info.platform === '3speak')) &&
        json.video.info.author === editor.editingPosts[network].author &&
        json.video.info.permlink === editor.editingPosts[network].permlink &&
        !editor.editingPlatforms.includes('3Speak')) {
        editor.editingPlatforms.push('3Speak')
        if (!isRef) {
            // not sure which one
            editor.params.title = json.title || json.video.info.title
            editor.params.description = json.description || json.video.content.description
            editor.params.tags = json.tags
            if (Array.isArray(json.sourceMap))
                for (let s in json.sourceMap) {
                    if (json.sourceMap[s].type === 'thumbnail') {
                        editor.params.imghash = json.sourceMap[s].url.replace('ipfs://','')
                        break
                    }
                }
            else {
                editor.params.imghash = json.video.info.ipfsThumbnail
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

    document.getElementById('editPlatforms').innerText = 'Editing on '+ (editor.editingPlatforms.length === 1 ? editor.editingPlatforms[0] : editor.editingPlatforms.slice(0,-1).join(', ') + ' and ' + editor.editingPlatforms[editor.editingPlatforms.length-1])
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