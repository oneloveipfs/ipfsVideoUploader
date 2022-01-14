let config, shawpconfig
window.logins = {}

localStorage.setItem('hivesignerToken',null)
localStorage.setItem('hivesignerUsername',null)

document.addEventListener('DOMContentLoaded', () => {
    let url = new URL(window.location.href)
    if (url.searchParams.get('callback') == 'signupstart')
        updateDisplayByIDs(['signupstart','signupPopup'],['signupcancel','signupcb'])
    else if (url.searchParams.get('callback') == 'signupcancel')
        updateDisplayByIDs(['signupcancel','signupPopup'],['signupstart'])
    else if (url.searchParams.get('callback') == 'signupcb')
        updateDisplayByIDs(['signupcb','signupPopup'],['signupstart'])

    if (!isElectron()) {
        updateDisplayByIDs([],['hiveLoginKey','blurtLoginKey','steemLoginKey'])
        let tohide = document.getElementsByClassName('rememberme')
        for (let i = 0; i < tohide.length; i++)
            tohide[i].style.display = "none"
    } else {
        let tochange = document.getElementsByClassName('kcAuth')
        for (let i = 0; i < tochange.length; i++)
            tochange[i].innerText = 'Login'
        //updateDisplayByIDs([],['avalonKcAuthOr','avalonKcAuthBtn'])
    }

    axios.get('/config').then((result) => {
        config = result.data

        if (!config.hivesignerEnabled || isElectron()) {
            let tohide = document.getElementsByClassName("sclogin")
            for (let i = 0; i < tohide.length; i++)
                tohide[i].style.display = "none"
        }
    })

    axios.get('/shawp_config').then((result) => {
        shawpconfig = result.data
        if (shawpconfig.Enabled) {
            updateDisplayByIDs(['homepagePriceLbl'],[])
            document.getElementById('signupButton').style.display = 'inline-block'
        }
        document.getElementById('homepagePriceLbl').innerText = '$' + (shawpconfig.DefaultUSDRate * 30) + '/GB/month'

        let paymentOptions = document.getElementById('pymtMtd').getElementsByTagName('option')
        for (let i = 0; i < paymentOptions.length; i++) {
            if ((paymentOptions[i].value == "HIVE" || paymentOptions[i].value == "HBD") && !shawpconfig.HiveReceiver)
                paymentOptions[i].disabled = true
        }
    })

    window.keychainLoginBtn = document.getElementById('proceedAuthBtn')
    window.proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
    document.getElementById('authButton').onclick = loginBtnClicked
    document.getElementById('authButton2').onclick = loginBtnClicked
})

window.onclick = (event) => {
    dismissPopup(event,'loginPopup')
    dismissPopup(event,'signupPopup')
}

window.ontouchstart = (event) => {
    dismissPopup(event,'loginPopup')
    dismissPopup(event,'signupPopup')
}

function dismissPopup(event,popupelement) {
    let popup = document.getElementById(popupelement)
    if (event.target == popup) {
        popup.style.display = "none"
    }
}

function loginBtnClicked() {
    // Show popup window of login options
    if (isElectron() && localStorage.getItem('persistentLogin') !== null) {
        let storedLogin
        let persistentLoginText = 'Persistent login found.<br>'
        if (!isEncryptedStore('persistentLogin'))
            try {
                storedLogin = JSON.parse(localStorage.getItem('persistentLogin'))
                if ((!storedLogin.avalonUser && !storedLogin.hiveUser && !storedLogin.steemUser) || 
                    (storedLogin.avalonUser && !storedLogin.avalonKey) || 
                    (storedLogin.hiveUser && !storedLogin.hiveKey) || 
                    (storedLogin.steemUser && !storedLogin.steemKey) ||
                    (storedLogin.blurtUser && !storedLogin.blurtKey)) throw 'invalid keys'
                if (storedLogin.hiveUser) persistentLoginText += '<br>Hive: ' + storedLogin.hiveUser
                if (storedLogin.steemUser) persistentLoginText += '<br>Steem: ' + storedLogin.steemUser
                if (storedLogin.blurtUser) persistentLoginText += '<br>Blurt: ' + storedLogin.blurtUser
                if (storedLogin.avalonUser) persistentLoginText += '<br>Avalon: ' + storedLogin.avalonUser
            } catch {
                return updateDisplayByIDs(['loginPopup'],[])
            }
        else
            persistentLoginText = 'Encrypted persistent login found.<br>'
        document.getElementById('persistentLoginText').innerHTML = persistentLoginText
        updateDisplayByIDs(['persistentform','loginPopup'],['loginform'])
        if (isEncryptedStore('persistentLogin'))
            updateDisplayByIDs(['persistLoginPassword'],[])
        else
            updateDisplayByIDs([],['persistLoginPassword'])
    } else updateDisplayByIDs(['loginPopup','loginform'],['persistentform'])
}

async function proceedLogin() {
    if (!window.logins.hiveUser && !window.logins.avalonUser)
        return alert('Hive or Avalon login is required')
    else if (!window.logins.token)
        return alert('Missing access token')
    let cbUrl = '/upload?access_token=' + window.logins.token
    if (isElectron())
        storeLogins()
    if (window.logins.keychain) cbUrl += '&keychain=true'
    if (window.logins.steemUser) cbUrl += '&steemuser=' + window.logins.steemUser
    if (window.logins.blurtUser) cbUrl += '&blurtuser=' + window.logins.blurtUser
    if (window.logins.avalonUser && !window.logins.hiveUser) cbUrl += '&dtconly=true'
    window.location.href = cbUrl
}

async function hivesignerLogin() {
    // HiveSigner login
    let hiveClient = new hivesigner.Client({
        app: config.hivesignerApp,
        callbackURL: window.location.origin + '/hivesigner',
        scope: ['comment','comment_options']
    })

    let hsUrl = hiveClient.getLoginURL()
    let hsWindow = window.open(hsUrl)
    let hsInterval = setInterval(() => {
        if (hsWindow.closed) {
            clearInterval(hsInterval)
            window.logins.token = localStorage.getItem('hivesignerToken')
            window.logins.hiveUser = localStorage.getItem('hivesignerUsername')
            loginCb('hive',window.logins.token,true)
        }
    },1000)
}

async function proceedPersistentLogin() {
    let dec = retrieveEncrypted('persistentLogin',document.getElementById('persistLoginPassword').value)
    if (dec === null) return alert('Invalid password')
    if (proceedAuthBtnDisabled) return
    proceedAuthBtnDisabled = true
    document.getElementById('proceedPersistAuthBtn').innerText = 'Logging In...'
    let storedDetails
    try {
        storedDetails = JSON.parse(dec)
    } catch {
        return handleLoginError('Could not parse persistent login info')
    }
    for (let k in storedDetails) {
        if (k.endsWith('User')) {
            let n = k.replace('User','')
            sessionStorage.setItem(n+'User',storedDetails[n+'User'])
            sessionStorage.setItem(n+'Key',storedDetails[n+'Key'])
        }
        if (k !== 'token')
            window.logins[k] = storedDetails[k]
    }
    let network = storedDetails.tokenNetwork
    if (network === 'avalon')
        network = 'dtc'
    axios.get(`/login?network=${network}&user=${storedDetails[storedDetails.tokenNetwork+'User']}`).then((r) => {
        if (r.data.error != null)
            return handleLoginError(r.data.error)
        console.log(storedDetails,r.data)
        if (storedDetails.tokenNetwork === 'hive') {
            let t
            try {
                t = hivecrypt.decode(storedDetails.hiveKey,r.data.encrypted_memo).substr(1)
            } catch {
                return handleLoginError('Unable to decode access token with posting key','hive')
            }
            console.log(t)
            keychainCb(t,'hive',true)
        } else if (storedDetails.tokenNetwork === 'avalon') {
            javalon.decrypt(storedDetails.avalonKey,r.data.encrypted_memo,(e,decryptedAES) => {
                if (e)
                    return handleLoginError('Avalon decrypt error: ' + e,'avalon')
                keychainCb(decryptedAES,'avalon',true)
            })
        }
    })
}

function clearPersistentLogin() {
    localStorage.setItem('persistentLogin',null)
    updateDisplayByIDs(['loginform'],['persistentform'])
}

function getPaymentInfo() {
    if (document.getElementById('gbdaysInput').value == '') return alert('Please specify GBdays to purchase.')
    let selectedNetwork = document.getElementById('signupNetwork').value
    let receipient = document.getElementById('receiverUsername').value
    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    let nativePymtProcessors = ['DTC','HIVE','HBD']
    if (selectedNetwork === 'none') return alert('Please select a network for your account.')

    // Validate usernames
    let hiveValid = validateHiveUsername(receipient)
    let dtcValid = validateAvalonUsername(receipient)
    if (selectedNetwork === 'all' && receipient && (hiveValid !== null || dtcValid !== null))
        return alert(hiveValid || dtcValid)
    if (selectedNetwork === 'hive' && hiveValid !== null)
        return alert(hiveValid)
    if (selectedNetwork === 'dtc' && dtcValid !== null)
        return alert(dtcValid)
    
    if (creditsToBuy <= 0) return alert('Purchase quantity must not be less than or equals to zero.')
    if (nativePymtProcessors.includes(paymentMethod)) exchageRate(paymentMethod,creditsToBuy,(e,amt) => {
        if (e) return alert(e)
        amt = paymentMethod === 'DTC' ? amt.toFixed(2) : amt.toFixed(3)
        if (receipient) document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod
        updateDisplayByIDs(['nativeDisclaimer','xferMemo'],[])

        let memo = selectedNetwork === 'all' ? ('to: @' + receipient) : ('to: ' + selectedNetwork + '@' + receipient)
        if (selectedNetwork === 'all' && !receipient)
            memo = ''

        document.getElementById('xferMemo').innerHTML = memo !== '' ? 'Memo: <u>' + memo + '</u> <a onclick="copyToClipboard(\''+ memo + '\',\'copymemo\')"><i class="fas fa-clipboard tooltip" id="copybtn"><span class="tooltiptext" id="copymemo">Click to copy</span></i></a>' : 'No memo required'

        switch (paymentMethod) {
            case 'DTC':
                updateDisplayByIDs(['DTubeChannelBtn','dtcInstruction'],['HiveKeychainBtn','HiveSignerBtn'])
                document.getElementById('DTubeChannelBtn').onclick = () => window.open('https://d.tube/#!/c/' + shawpconfig.DtcReceiver)
                document.getElementById('DTubeChannelBtn').href = 'https://d.tube/#!/c/' + shawpconfig.DtcReceiver
                break
            case 'HIVE':
            case 'HBD':
                updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn'],['DTubeChannelBtn','dtcInstruction'])
                document.getElementById('HiveKeychainBtn').onclick = () => {
                    hive_keychain.requestTransfer(receipient,shawpconfig.HiveReceiver,amt.toString(),memo,paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        updateDisplayByIDs(['signupcb'],['signuppay'])
                    })
                }
                document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + (memo !== '' ? '&memo=' + memo : '')
                break
            default:
                break
        }

        updateDisplayByIDs(['signuppay'],['signupstart'])
    })
}

function redeemVoucher() {
    alert('Invalid voucher code')
}

function signupNetworkSelect() {
    switch (document.getElementById('signupNetwork').value) {
        case 'none':
            document.getElementById('receiverUsername').placeholder = 'Username'
            break
        case 'all':
            document.getElementById('receiverUsername').placeholder = 'Username (if different from sender address)'
            break
        case 'hive':
            document.getElementById('receiverUsername').placeholder = 'HIVE Username'
            break
        case 'dtc':
            document.getElementById('receiverUsername').placeholder = 'AVALON Username'
            break
    }
}

function hiveLogin() {
    if (window.proceedAuthBtnDisabled == true) return
    let hiveUsername = document.getElementById('hiveLoginUsername').value.toLowerCase().replace('@','')
    let hiveKey = document.getElementById('hiveLoginKey').value

    if (!hiveUsername) return alert('Username is required')
    if (!window.hive_keychain && !isElectron()) return alert('Hive Keychain is not installed')
    if (!hiveKey && isElectron()) return alert('Posting key is required')

    document.getElementById('hiveAuthBtn').innerText = 'Logging in...'
    proceedAuthBtnDisabled = true

    let loginUrl = '/login?network=hive&user='+hiveUsername
    axios.get(loginUrl).then((response) => {
        if (response.data.error != null)
            return handleLoginError(response.data.error,'hive')
        else if (isElectron()) {
            let t
            try {
                t = hivecrypt.decode(hiveKey,response.data.encrypted_memo).substr(1)
            } catch {
                return handleLoginError('Unable to decode access token with posting key','hive')
            }
            sessionStorage.setItem('hiveUser',hiveUsername)
            sessionStorage.setItem('hiveKey',hiveKey)
            keychainCb(t,'hive')
        } else hive_keychain.requestVerifyKey(hiveUsername,response.data.encrypted_memo,'Posting',(loginResponse) => {
            if (loginResponse.error != null)
                return handleLoginError(loginResponse.message,'hive')
            keychainCb(loginResponse.result.substr(1),'hive')
        })
    })
}

function keychainCb(encrypted_message,network,persistence) {
    axios.post('/logincb',encrypted_message,{ headers: { 'content-type': 'text/plain' }}).then((cbResponse) => {
        if (cbResponse.data.error != null) {
            alert(cbResponse.data.error)
        } else {
            console.log(cbResponse.data)
            if (isElectron() && persistence) {
                window.logins.token = cbResponse.data.access_token
                window.logins.tokenNetwork = network
                window.logins.keychain = true
                proceedLogin()
            } else
                loginCb(network,cbResponse.data.access_token,false)
        }
    }).catch((err) => {
        if (err.response.data.error)
            handleLoginError(err.response.data.error,network)
        else
            handleLoginError(err,network)
    }).finally(() => window.proceedAuthBtnDisabled = false)
}

function loginCb(network,token,oauth2) {
    if (!window.logins.token && token) {
        window.logins.token = token
        window.logins.tokenNetwork = network
        window.logins.keychain = !oauth2
    }
    if (!oauth2) {
        window.logins[network+'User'] = document.getElementById(network+'LoginUsername').value.toLowerCase().replace('@','')
        window.logins[network+'Key'] = document.getElementById(network+'LoginKey').value
    }
    window.proceedAuthBtnDisabled = false
    updateDisplayByIDs(['loginformmain'],['loginform'+network])
    document.getElementById('loginnetwork'+network).innerHTML = '<h5 id="loginnetwork'+network+'username"></h5>'
    document.getElementById('loginnetwork'+network+'username').innerText = window.logins[network+'User']
}

async function avalonLogin() {
    if (window.proceedAuthBtnDisabled == true) return
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    document.getElementById('avalonAuthBtn').innerText = 'Logging in...'
    proceedAuthBtnDisabled = true

    javalon.init({api: 'https://avalon.oneloved.tube'})
    let avalonKeyId = false
    try {
        avalonKeyId = await getAvalonKeyId(avalonUsername,avalonKey)
        if (avalonKeyId === false)
            return handleLoginError('Invalid Avalon key','avalon')
    } catch (e) {
        return handleLoginError('Avalon login error: ' + e.toString(),'avalon')
    }

    sessionStorage.setItem('avalonUser',avalonUsername)
    sessionStorage.setItem('avalonKey',avalonKey)

    if (window.logins.token) {
        // an access token already generated, login is complete
        loginCb('avalon')
    } else {
        let loginGetUrl = '/login?user=' + avalonUsername + '&dtc=true'
        if (typeof avalonKeyId === 'string') loginGetUrl += '&dtckeyid=' + avalonKeyId
        axios.get(loginGetUrl).then((response) => {
            if (response.data.error != null)
                return handleLoginError(response.data.error,'avalon')
            javalon.decrypt(avalonKey,response.data.encrypted_memo,(e,decryptedAES) => {
                if (e)
                    return handleLoginError('Avalon decrypt error: ' + e.error,'avalon')
                keychainCb(decryptedAES,'avalon')
            })
        }).catch((e) => {
            axiosErrorHandler(e)
            handleLoginError('','avalon')
        })
    }
}

async function blurtLogin() {
    if (window.proceedAuthBtnDisabled == true) return
    let blurtUsername = document.getElementById('blurtLoginUsername').value.toLowerCase().replace('@','')
    let blurtKey = document.getElementById('blurtLoginKey').value

    if (!blurtUsername) return alert('Username is required')
    if (!window.blurt_keychain && !isElectron()) return alert('Blurt Keychain is not installed')
    if (!blurtKey && isElectron()) return alert('Posting key is required')

    document.getElementById('blurtAuthBtn').innerText = 'Logging in...'
    proceedAuthBtnDisabled = true

    if (isElectron()) {
        try {
            // TODO: Replace API with our own
            await steemKeyLogin(blurtUsername,blurtKey,'https://rpc.blurt.world','BLT')
        } catch (e) {
            alert(e.toString())
            proceedAuthBtnDisabled = false
            document.getElementById('blurtAuthBtn').innerText = 'Login'
            return
        }
        sessionStorage.setItem('blurtUser',blurtUsername)
        sessionStorage.setItem('blurtKey',blurtKey)
        loginCb('blurt')
    } else {
        blurt_keychain.requestSignBuffer(blurtUsername,'login','Posting',(blurtLoginRes) => {
            if (blurtLoginRes.success)
                loginCb('blurt')
            else {
                alert('Blurt Keychain login error: ' + blurtLoginRes.message)
                proceedAuthBtnDisabled = false
                document.getElementById('blurtAuthBtn').innerText = 'Login'
                return
            }
        })
    }
}

// NOTE: I really want to remove Steem from OneLoveIPFS entirely, however
// there are people who still post there so limited support will have to stay unfortunately :\
async function steemLogin() {
    if (window.proceedAuthBtnDisabled == true) return
    let steemUsername = document.getElementById('steemLoginUsername').value.toLowerCase().replace('@','')
    let steemKey = document.getElementById('steemLoginKey').value

    if (!steemUsername) return alert('Username is required')
    if (!window.steem_keychain && !isElectron()) return alert('Blurt Keychain is not installed')
    if (!steemKey && isElectron()) return alert('Posting key is required')

    document.getElementById('steemAuthBtn').innerText = 'Logging in...'
    proceedAuthBtnDisabled = true

    if (isElectron()) {
        try {
            await steemKeyLogin(steemUsername,steemKey)
        } catch (e) {
            alert(e.toString())
            proceedAuthBtnDisabled = true
            document.getElementById('steemAuthBtn').innerText = 'Login'
            return
        }
        sessionStorage.setItem('steemUser',steemUsername)
        sessionStorage.setItem('steemKey',steemKey)
        loginCb('steem')
    } else {
        steem_keychain.requestSignBuffer(steemUsername,'login','Posting',(steemLoginRes) => {
            if (steemLoginRes.success)
                loginCb('steem')
            else {
                alert('Steem Keychain login error: ' + steemLoginRes.message)
                proceedAuthBtnDisabled = false
                document.getElementById('steemAuthBtn').innerText = 'Login'
                return
            }
        })
    }
}

function steemKeyLogin(username,wif,api='https://api.steemit.com',prefix='STM') {
    return new Promise((rs,rj) => {
        let steemGetAcc = {
            id: 1,
            jsonrpc: '2.0',
            method: 'condenser_api.get_accounts',
            params: [[username]]
        }
        axios.post(api,steemGetAcc).then((r) => {
            if (r.data.error)
                return rj(r.data.error.message)
            let acc = r.data.result
            if (acc.length == 0) return rj('Account does not exist')
            try {
                let pubkey = hive.auth.wifToPublic(wif).toString()
                if (prefix !== 'STM')
                    pubkey = pubkey.replace('STM',prefix)
                for (let i = 0; i < acc[0].posting.key_auths.length; i++)
                    if (acc[0].posting.key_auths[i][0].toString() === pubkey.toString())
                        return rs(true)
                rj('Invalid username or posting key')
            } catch (err) { return rj('Invalid username or posting key') }
        }).catch(() => rj('Failed to fetch account'))
    })
}

function storeEncrypted(key,value,password) {
    let pubK = hive.auth.getPrivateKeys('',password,['Posting']).PostingPubkey
    let wif = hivecrypt.randomWif()
    localStorage.setItem(key,hive.memo.encode(wif,pubK,'#'+value.toString()))
}

function retrieveEncrypted(key,password) {
    let wif = hive.auth.getPrivateKeys('',password,['Posting']).Posting
    let enc = localStorage.getItem(key)
    if (!enc.startsWith('#')) return enc
    try {
        let result = hive.memo.decode(wif,enc).substr(1)
        return result
    } catch {
        return null
    }
}

function isEncryptedStore(key) {
    let val = localStorage.getItem(key)
    return val === null ? false : localStorage.getItem(key).startsWith('#')
}

function storeLogins() {
    if (document.getElementById('rememberme').checked && window.logins.tokenNetwork) {
        let ptValue = JSON.stringify(window.logins)
        let psw = document.getElementById('persistPassword').value
        if (psw)
            storeEncrypted('persistentLogin',ptValue,psw)
        else
            localStorage.setItem('persistentLogin',ptValue)
    }
}

function handleLoginError(msg,network) {
    document.getElementById(network+'AuthBtn').innerText = 'Login'
    document.getElementById('proceedPersistAuthBtn').innerText = 'Proceed'
    proceedAuthBtnDisabled = false
    if (msg) alert(msg)
}

function updateRememberMeState() {
    if (document.getElementById('rememberme').checked)
        updateDisplayByIDs(['persistPassword'],[])
    else
        updateDisplayByIDs([],['persistPassword'])
}

function copyToClipboard(value,tooltiptextcontainer) {
    let fakeInput = document.createElement("input")
    fakeInput.value = value
    document.body.appendChild(fakeInput)
    fakeInput.select()
    document.execCommand("copy")
    document.body.removeChild(fakeInput)
    if (tooltiptextcontainer)
        document.getElementById(tooltiptextcontainer).innerText = 'Copied to clipboard'
}