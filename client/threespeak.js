// Mandatory fees imposed by 3Speak team
const SPK_FEES = {
    'spk.beneficiary': 850,
    threespeakleader: 100,
    sagarkothari88: 100
}

const SPK_ENCODER_FEE = 100

function spkNoticeCheckboxChanged() {
    document.getElementById('spkNoticeContinueBtn').disabled = !document.getElementById('spkUploadAgreeNotice').checked || !document.getElementById('spkUploadAgreeTerms').checked
}

function spkNoticeContinue() {
    updateDisplayByIDs(['spkauth'],['spknotice','spknotice-actions'])
    updateDisplayByIDs(['spkauth-actions'],[],'flex')
    document.getElementById('spkPopupHeader').innerText = '3Speak Auth'
}

function spkGetAccessToken() {
    togglePopupActions('spkauth-actions',true)
    if (isElectron()) {
        window.postMessage({ action: 'spk_auth', data: usernameByNetwork('hive') })
        let channel = new BroadcastChannel('spk_auth_result')
        channel.onmessage = (evt) => spkAuthResult(evt.data)
    } else
        spkError('Usage of 3Speak API is only available in desktop app','spkauth-actions')
}

function spkAuthResult(result) {
    if (result.error)
        return spkError(result.error, 'spkauth-actions')
    if (hiveAuthLogin) {
        return spkError('HiveAuth can\'t decrypt memos?!', 'spkauth-actions')
    } else if (isElectron()) {
        let t
        try {
            t = hivecrypt.decode(sessionStorage.getItem('hiveKey'),result.memo).substr(1)
        } catch {
            return spkError('Failed to decode memo with posting key', 'spkauth-actions')
        }
        spkRequestCookie(t)
    } else if (window.hive_keychain)
        hive_keychain.requestVerifyKey(usernameByNetwork('hive'),result.memo,'Posting',kr => {
            if (kr.error)
                return spkError(kr.message, 'spkauth-actions')
            spkRequestCookie(kr.result)
        })
    else
        return spkError('Could not determine hive login', 'spkauth-actions')
}

function spkRequestCookie(token) {
    if (isElectron()) {
        window.postMessage({ action: 'spk_cookie', data: { user: usernameByNetwork('hive'), token: token } })
        let channel = new BroadcastChannel('spk_cookie_result')
        channel.onmessage = (evt) => spkCookieResult(evt.data)
    } else
        spkError('Usage of 3Speak API is only available in desktop app','spkauth-actions')
}

function spkCookieResult(cookie) {
    console.log(cookie)
    if (cookie.error)
        return spkError(cookie.error, 'spkauth-actions')
    document.cookie = cookie.cookie
}

function spkError(error, group) {
    alert(error)
    if (group)
        togglePopupActions(group,false)
}