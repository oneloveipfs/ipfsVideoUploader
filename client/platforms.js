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

document.addEventListener('DOMContentLoaded', () => {
    let pages = ['uploadForm','thumbnailSwapper','yourFiles','wcinfo','refiller','getHelp','dropdownbox','settings']
    document.getElementById('newUploadModeBtn').onclick = () => updateDisplayByIDs(['uploadForm'],pages)
    document.getElementById('snapSwapModeBtn').onclick = () => updateDisplayByIDs(['thumbnailSwapper'],pages)
    document.getElementById('yourFilesModeBtn').onclick = () => updateDisplayByIDs(['yourFiles'],pages)
    document.getElementById('subDetModeBtn').onclick = () => updateDisplayByIDs(['wcinfo'],pages)
    document.getElementById('refillCrModeBtn').onclick = () => updateDisplayByIDs(['refiller'],pages)
    document.getElementById('getHelpModeBtn').onclick = () => updateDisplayByIDs(['getHelp'],pages)
    document.getElementById('settingsModeBtn').onclick = () => updateDisplayByIDs(['settings'],pages)
})

window.onclick = windowClick
window.ontouchstart = windowClick

function windowClick(event) {
    closeMenu(event)
    dismissPopup(event,'refillPopup')
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
    let selected = []
    for (let p in isPlatformSelected)
        if (isPlatformSelected[p]) {
            selected.push(p)
            document.getElementById('pfSelect'+p).innerHTML = '<i class="tick-mark"></i>'+p
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
    let joined = ''
    if (selected.length === 0)
        joined = 'No platform selected'
    else if (selected.length === 1)
        joined = selected[0]
    else
        joined = selected.slice(0,-1).join(', ') + ' and ' + selected[selected.length-1]
    document.getElementById('platformStr').innerText = (selected.length > 0 ? 'Posting to ' : '') + joined

    if (selected.includes('3Speak')) {
        document.getElementById('hlsencode').checked = true
        document.getElementById('hlsencode').disabled = true
        document.getElementById('hlsencodetext').innerText = '  All 3Speak uploads are encoded to HLS'
    } else {
        document.getElementById('hlsencode').disabled = false
        document.getElementById('hlsencodetext').innerText = '  Encode video to HLS'
    }
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

function updateEncoderDisplay() {
    if (document.getElementById('hlsencode').checked)
        updateDisplayByIDs([],['mp4encodedupload'])
    else
        updateDisplayByIDs(['mp4encodedupload'],[])
}