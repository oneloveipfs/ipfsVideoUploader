const defaultPlatforms = {
    hive: '3Speak',
    avalon: 'DTube'
}

const supportedPlatforms = {
    hive: ['3Speak','DTube'],
    avalon: ['DTube'],
    steem: ['DTube'],
    blurt: ['DTube']
}

const allowedPlatformNetworks = {
    '3Speak': ['hive'],
    'DTube': ['avalon','hive','steem','blurt']
}

const isPlatformSelected = {
    '3Speak': false,
    'DTube': false
}

const grapheneNetworks = ['hive','steem','blurt']

document.addEventListener('DOMContentLoaded', () => {
    let pages = ['uploadForm','thumbnailSwapper','yourFiles','wcinfo','refiller','getHelp','dropdownbox','settings','scheduledPublishes','postpublish','draftList','spkUploads']
    let evts = ['onclick','ontouchstart']
    for (let e in evts) {
        document.getElementById('newUploadModeBtn')[evts[e]] = () => updateDisplayByIDs(['uploadForm'],pages)
        document.getElementById('snapSwapModeBtn')[evts[e]] = () => updateDisplayByIDs(['thumbnailSwapper'],pages)
        document.getElementById('yourFilesModeBtn')[evts[e]] = () => updateDisplayByIDs(['yourFiles'],pages)
        document.getElementById('subDetModeBtn')[evts[e]] = () => updateDisplayByIDs(['wcinfo'],pages)
        document.getElementById('refillCrModeBtn')[evts[e]] = () => updateDisplayByIDs(['refiller'],pages)
        document.getElementById('getHelpModeBtn')[evts[e]] = () => updateDisplayByIDs(['getHelp'],pages)
        document.getElementById('settingsModeBtn')[evts[e]] = () => updateDisplayByIDs(['settings'],pages)
        document.getElementById('oliscModeBtn')[evts[e]] = () => updateDisplayByIDs(['scheduledPublishes'],pages)
        document.getElementById('draftModeBtn')[evts[e]] = () => updateDisplayByIDs(['draftList'],pages)
        document.getElementById('spkModeBtn')[evts[e]] = () => updateDisplayByIDs(['spkUploads'],pages)
    }
})

window.onclick = windowClick
window.ontouchstart = windowClick

function windowClick(event) {
    closeMenu(event)
    dismissPopup(event,'refillPopup')
    dismissPopup(event,'spkPopup')
    dismissPopup(event,'spkListPopup')
    let target = event.target
    if (target.tagName.toLowerCase() === 'svg')
        target = target.parentElement
    if (scheduleDatePicker && target.id !== ('scheduleposttime') && !isClickingDateTimePicker(target.classList))
        scheduleDatePicker.close()
}

function isClickingDateTimePicker(classList = []) {
    classList = Array.from(classList)
    for (let i in classList)
        if (classList[i].startsWith('flatpickr') || classList[i].startsWith('numInput') || classList[i] === 'arrowUp' || classList[i] === 'arrowDown')
            return true
    return false
}

function closeMenu(event) {
    let targets = [
        'modeBtn',
        'headerMenu',
        'dropdownArrow',
    ]
    let platformTargets = [
        'platformBtn',
        'platformLogoLoading',
        'platformLogoMult',
        'platformLogoDTube',
        'platformLogo3Speak',
        'dropdownArrowPlatform',
        'pfSelect3Speak',
        'pfSelectDTube'
    ]
    if (!targets.includes(event.target.id))
        updateDisplayByIDs([],['dropdownbox'])
    if (!platformTargets.includes(event.target.id))
        updateDisplayByIDs([],['dropdownbox2'])
}

function topbarItmClicked(id) {
    if (document.getElementById(id).style.display === 'block')
        updateDisplayByIDs([],[id])
    else
        updateDisplayByIDs([id],[])
}

function topbarItmHover(id) {
    document.getElementById(id).style.border = 'solid rgb(54,57,63)'
    document.getElementById(id).style.borderWidth = '0 3px 3px 0'
}

function topbarItmLeave(id) {
    document.getElementById(id).style.border = 'solid #ffffff'
    document.getElementById(id).style.borderWidth = '0 3px 3px 0'
}

function getSelectedPlatforms() {
    let result = []
    for (let pf in isPlatformSelected)
        if (isPlatformSelected[pf])
            result.push(pf)
    return result
}

function loadSelectPlatforms() {
    if (!loadSavedPlatforms())
        loadDefaultPlatforms()
    updateDisplayPlatforms()
}

function loadDefaultPlatforms() {
    if (hiveDisplayUser)
        isPlatformSelected[defaultPlatforms.hive] = true
    if (dtcDisplayUser)
        isPlatformSelected[defaultPlatforms.avalon] = true
}

function loadSavedPlatforms() {
    let loaded = false
    for (let p in allowedPlatformNetworks) 
        if (localStorage.getItem('enable'+p) === 'true')
            for (let i in allowedPlatformNetworks[p]) {
                switch (allowedPlatformNetworks[p][i]) {
                    case 'hive':
                        if (hiveDisplayUser)
                            isPlatformSelected[p] = true
                        break
                    case 'avalon':
                        if (dtcDisplayUser)
                            isPlatformSelected[p] = true
                        break
                    default:
                        break
                }
                if (isPlatformSelected[p]) {
                    loaded = true
                    break
                }
            }
    return loaded
}

function updateDisplayPlatforms() {
    document.getElementById('postpublishwatch').innerHTML = ''
    document.getElementById('postpublishembed').innerHTML = ''
    let selected = []
    for (let p in isPlatformSelected)
        if (isPlatformSelected[p]) {
            selected.push(p)
            document.getElementById('pfSelect'+p).innerHTML = '<i class="tick-mark"></i>'+p

            // post-publish watch
            let postpublishwatch = document.createElement('div')
            let postpublishwatchbtn = document.createElement('a')
            postpublishwatch.setAttribute('class','grid-item')
            postpublishwatchbtn.setAttribute('id','postpublishwatch'+p)
            postpublishwatchbtn.setAttribute('class','styledButton')
            postpublishwatchbtn.setAttribute('target','_blank')
            postpublishwatchbtn.innerText = 'Watch on '+p
            postpublishwatch.appendChild(postpublishwatchbtn)
            document.getElementById('postpublishwatch').appendChild(postpublishwatch)

            // post-publish copy embed
            let postpublishembed = document.createElement('div')
            let postpublishembedbtn = document.createElement('a')
            let postpublishembedtt = document.createElement('span')
            postpublishembed.setAttribute('class','grid-item')
            postpublishembedbtn.setAttribute('id','postpublishembed'+p)
            postpublishembedbtn.setAttribute('class','styledButton tooltip')
            postpublishembedbtn.innerText = 'Copy '+p+' embed'
            postpublishembedtt.setAttribute('id','postpublishembedtt'+p)
            postpublishembedtt.setAttribute('class','tooltiptext')
            postpublishembedtt.innerText = 'Click to copy'
            postpublishembedbtn.append(postpublishembedtt)
            postpublishembed.appendChild(postpublishembedbtn)
            document.getElementById('postpublishembed').appendChild(postpublishembed)
        }
    updateDisplayByIDs([],['platformLogoLoading','platformLogoMult','platformLogo3Speak','platformLogoDTube'])
    if (selected.length > 1 || selected.length === 0) {
        document.getElementById('platformLogoMult').style.display = 'block'
        document.getElementById('platformLogoMult').innerText = selected.length+'P'
        document.getElementById('platformLogoMult').style.width = '50px'
        document.getElementById('dropdownArrowPlatform').style.transform = 'rotate(45deg) translate(-15px,-38px)'
    } else if (selected[0] === '3Speak') {
        document.getElementById('platformLogo3Speak').style.display = 'inline'
        document.getElementById('dropdownArrowPlatform').style.transform = 'rotate(45deg) translate(-6px,-12px)'
    } else if (selected[0] === 'DTube') {
        document.getElementById('platformLogoDTube').style.display = 'inline'
        document.getElementById('dropdownArrowPlatform').style.transform = 'rotate(45deg) translate(-6px,-12px)'
    }
    document.getElementById('platformStr').innerText = selected.length > 0 ? ('Posting to '+listWords(selected)) : 'No platform selected'
    document.getElementById('beneficiariesDesc').innerText = Beneficiaries.describe()

    if (selected.includes('3Speak')) {
        document.getElementById('hlsencode').checked = true
        document.getElementById('hlsencode').disabled = true
        document.getElementById('hlsencodetext').innerText = '  All 3Speak uploads are encoded to HLS'
        // 3speak does not have subtitles
        if (selected.length === 1)
            updateDisplayByIDs([],['tabSubtitles'])
        else
            document.getElementById('tabSubtitles').style.display = 'initial'
        // custom permlinks are unsupported
        document.getElementById('customPermlink').disabled = true
        document.getElementById('customPermlinkField').classList.add('tooltip')
        document.getElementById('customPermlinkField').classList.add('tooltippm')
        // for now scheduled publishes are unsupported
        updateDisplayByIDs([],['schedulepost','scheduledStr'])
        updateDisplayByIDs(['customPermlink3Speak'],[])
    } else {
        document.getElementById('hlsencode').disabled = false
        document.getElementById('hlsencodetext').innerText = '  Encode video to HLS'
        document.getElementById('customPermlink').disabled = false
        document.getElementById('customPermlinkField').classList.remove('tooltip')
        document.getElementById('customPermlinkField').classList.remove('tooltippm')
        updateDisplayByIDs([],['customPermlink3Speak'])
        if (config && config.olisc)
            updateDisplayByIDs(['schedulepost','scheduledStr'],[])
    }
    if (selected.includes('DTube') && config && config.skynetEnabled)
        updateDisplayByIDs(['skynetswitch'],[])
    else {
        document.getElementById('skynetupload').checked = false
        updateDisplayByIDs([],['skynetswitch'])
    }
    if (selected.length < 2)
        updateDisplayByIDs([],['postpublishsharetgpf'])
    else
        updateDisplayByIDs(['postpublishsharetgpf'],[],'inline-block')
    updateEncoderDisplay()
}

function pfSelect(p) {
    if (isPlatformSelected[p]) {
        isPlatformSelected[p] = false
        document.getElementById('pfSelect'+p).innerHTML = p
        localStorage.setItem('enable'+p,'false')
    } else {
        isPlatformSelected[p] = true
        document.getElementById('pfSelect'+p).innerHTML = '<i class="tick-mark"></i>'+p
        localStorage.setItem('enable'+p,'true')
    }
    updateDisplayPlatforms()
}

function pfPostEmbed(network) {
    switch (network) {
        case 'hive':
            if (isPlatformSelected['3Speak'])
                return '3Speak'
            else
                return 'DTube'
        case 'steem':
        case 'blurt':
            return 'DTube'
        default:
            return ''
    }
}

function pfPlayerEmbed(pf) {
    let av = usernameByNetwork('avalon')
    switch (pf) {
        case '3Speak':
            return '<iframe src="https://3speak.tv/embed?v='+usernameByNetwork('hive')+'/'+postparams.permlink+'&autoplay=false" frameborder="0" allowfullscreen></iframe>'
        case 'DTube':
            return '<iframe src="https://emb.d.tube/#!/'+(av?av:username)+'/'+(av?generateAvalonLinkFromIpfsHash(postparams.ipfshash):postparams.permlink)+'" frameborder="0" allowfullscreen></iframe>'
    }
}

function updateEncoderDisplay() {
    if (document.getElementById('hlsencode').checked)
        updateDisplayByIDs([],['mp4encodedupload'])
    else
        updateDisplayByIDs(['mp4encodedupload'],[])
}

function postpublish() {
    if (isPlatformSelected['3Speak']) {
        document.getElementById('postpublishwatch3Speak').onclick = () => window.open('https://3speak.tv/watch?v='+usernameByNetwork('hive')+'/'+postparams.permlink)
        document.getElementById('postpublishembed3Speak').onclick = () => copyToClipboard(pfPlayerEmbed('3Speak'),'postpublishembedtt3Speak')
    }
    if (isPlatformSelected['DTube']) {
        let du = usernameByNetwork('avalon')
        let dp = generateAvalonLinkFromIpfsHash(postparams.ipfshash)
        if (!du) {
            du = username
            dp = postparams.permlink
        }
        document.getElementById('postpublishwatchDTube').onclick = () => window.open('https://d.tube/#!/v/'+du+'/'+dp)
        document.getElementById('postpublishembedDTube').onclick = () => copyToClipboard(pfPlayerEmbed('DTube'),'postpublishembedttDTube')
    }
}

function postpublishshare(dest) {
    let tgpf = document.getElementById('postpublishsharetgpf').value
    let tgurl = ''
    let av = usernameByNetwork('avalon')
    let selected = getSelectedPlatforms()
    if (selected.length === 1)
        tgpf = selected[0]
    switch (tgpf) {
        case 'None':
            return alert('Please select a target video platform to share links')
        case 'DTube':
            tgurl = 'https://d.tube/#!/v/'+(av ? av : username)+'/'+(av ? generateAvalonLinkFromIpfsHash(postparams.ipfshash) : postparams.permlink)
            break
        case '3Speak':
            tgurl = 'https://3speak.tv/watch?v='+usernameByNetwork('hive')+'/'+postparams.permlink
            break
    }
    tgurl = encodeURIComponent(tgurl)
    let popupUrl = ''
    switch (dest) {
        case 'dbuzz':
            popupUrl = 'https://d.buzz/#/intent/buzz?title='+encodeURIComponent(postparams.title)+'&text='+tgurl
            break
        case 'twitter':
            popupUrl = 'http://twitter.com/intent/tweet?url='+tgurl
            break
        case 'reddit':
            popupUrl = 'http://www.reddit.com/submit?title='+encodeURIComponent(postparams.title)+'&url='+tgurl
            break
        case 'facebook':
            popupUrl = 'http://www.facebook.com/sharer/sharer.php?u='+tgurl
            break
        case 'tumblr':
            popupUrl = 'http://www.tumblr.com/share/link?url='+tgurl
            break
        case 'pinterest':
            popupUrl = 'http://www.pinterest.com/pin/create/button/?url='+tgurl+'&media='+encodeURIComponent(getPreferredIPFSGw(true)+'/ipfs/'+postparams.imghash)
            break
        case 'linkedin':
            popupUrl = 'http://linkedin.com/shareArticle?mini=true&amp;url='+tgurl
            break
        case 'email':
            popupUrl = 'mailto:user@example.com?subject='+encodeURIComponent(postparams.title)+'&body='+encodeURIComponent('Enjoy this video.\n')+tgurl
            break
        default:
            break
    }
    window.open(popupUrl,'name')
}

function generateAvalonLinkFromIpfsHash(ipfshash = '') {
    return ipfshash.split('/')[0].substring(0,50)
}