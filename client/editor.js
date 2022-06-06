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
    editing: false,
    editingPosts: {},
    editingPlatforms: [],
    steemIgnored: false,
    refs: []
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

    // fetch
    if (linkType === 'hive')
        hive.api.getContent(authorLinkSplit[0],authorLinkSplit[1],(e,content) => {
            console.log(e,content)
            if (e)
                return alert('Failed to fetch hive post, see browser console for details')
            editor.editingPosts.hive = content
            editorJsonCheck('hive')
        })
    else if (linkType === 'blurt')
        blurt.api.getContent(authorLinkSplit[0],authorLinkSplit[1],(e,content) => {
            console.log(e,content)
            if (e)
                return alert('Failed to fetch blurt post, see browser console for details')
            editor.editingPosts.blurt = content
            editorJsonCheck('blurt')
        })
    else if (linkType === 'dtube')
        javalon.getContent(authorLinkSplit[0],authorLinkSplit[1],(e,content) => {
            console.log(e,content)
            if (e)
                return alert('Failed to fetch avalon content, see browser console for details')
            editor.editingPosts.avalon = content
            editorJsonCheck('avalon')
        })
}

// json metadata check up to 1 refs deep
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
        json.video && json.video.info &&
        (Array.isArray(json.sourceMap) || (json.video.content && json.video.info.platform === '3speak')) &&
        json.video.info.author === editor.editingPosts[network].author &&
        json.video.info.permlink === editor.editingPosts[network].permlink &&
        !editor.editingPlatforms.includes('3Speak'))
        editor.editingPlatforms.push('3Speak')
    
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
            if (refSplit[0] === 'hive' && network !== 'hive')
                hive.api.getContent(refSplit[1],refSplit[2],(e,content) => {
                    console.log('hive ref',e,content,refSplit)
                    if (!e) {
                        editor.editingPosts.hive = content
                        editorJsonCheck('hive',true)
                    }
                })
            if (refSplit[0] === 'blurt' && network !== 'blurt')
                blurt.api.getContent(refSplit[1],refSplit[2],(e,content) => {
                    console.log('blurt ref',e,content,refSplit)
                    if (!e) {
                        editor.editingPosts.blurt = content
                        editorJsonCheck('blurt',true)
                    }
                })
            if (refSplit[0] === 'dtc' && network !== 'avalon')
                javalon.getContent(refSplit[1],refSplit[2],(e,content) => {
                    console.log('avalon ref',e,content,refSplit)
                    if (!e) {
                        editor.editingPosts.avalon = content
                        editorJsonCheck('avalon',true)
                    }
                })
        }
        editor.editing = true
    } else
        editor.refs.push(network)
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