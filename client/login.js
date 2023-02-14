let config, shawpconfig
let avalonKcToggled = false
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
        updateDisplayByIDs([],['hiveLoginKey','blurtLoginKey'])
        setDisplayByClass('rememberme')
    } else {
        let tochange = document.getElementsByClassName('kcAuth')
        for (let i = 0; i < tochange.length; i++)
            tochange[i].value = 'Login'
        updateDisplayByIDs([],['avalonKcAuthBtn'])
    }

    axios.get('/config').then((result) => {
        config = result.data

        if (!config.hivesignerEnabled || isElectron())
            setDisplayByClass('sclogin')
        if (isElectron()) {
            document.getElementById('appTypeRectTxt').innerText = config.isRemote ? 'Remote' : 'Local'
            updateDisplayByIDs(['appTypeRect'],[])
        }
        loadAPISelections()
    })

    axios.get('/shawp_config').then((result) => {
        shawpconfig = result.data
        if (shawpconfig.Enabled) {
            updateDisplayByIDs(['homepagePriceLbl'],[])
            document.getElementById('signupButton').style.display = 'inline-block'
        }
        document.getElementById('homepagePriceLbl').innerText = '$' + (shawpconfig.DefaultUSDRate * 30) + '/GB/month'
        disablePaymentMethods()
    })
    document.getElementById('authButton').onclick = loginBtnClicked
    document.getElementById('authButton2').onclick = loginBtnClicked
})

window.onclick = windowClick
window.ontouchstart = windowClick

function windowClick(event) {
    dismissPopup(event,'loginPopup')
    dismissPopup(event,'signupPopup')
    dismissPopup(event,'apiSettingsPopup')
}

function loginBtnClicked() {
    // Show popup window of login options
    if (isElectron() && localStorage.getItem('persistentLogin') !== null) {
        let storedLogin, persistentHiveAuth
        let persistentLoginText = 'Persistent login found.<br>'
        if (!isEncryptedStore('persistentLogin'))
            try {
                storedLogin = JSON.parse(localStorage.getItem('persistentLogin'))
                try {
                    persistentHiveAuth = JSON.parse(localStorage.getItem('hiveAuth'))
                } catch {
                    // Failed to retrieve persistent HiveAuth authentication info
                }

                // All other key based logins
                if ((!storedLogin.avalonUser && !storedLogin.hiveUser) || 
                    (storedLogin.avalonUser && !storedLogin.avalonKey) || 
                    (storedLogin.hiveUser && !storedLogin.hiveKey && !persistentHiveAuth) || 
                    (storedLogin.blurtUser && !storedLogin.blurtKey)) throw 'invalid keys'
                if (storedLogin.hiveUser) persistentLoginText += '<h4>Hive: ' + storedLogin.hiveUser + (persistentHiveAuth ? ' (HiveAuth)' : '')+'</h4>'
                if (storedLogin.blurtUser) persistentLoginText += '<h4>Blurt: ' + storedLogin.blurtUser+'</h4>'
                if (storedLogin.avalonUser) persistentLoginText += '<h4>Avalon: ' + storedLogin.avalonUser+'</h4>'
            } catch {
                return displayPopup('loginPopup')
            }
        else
            persistentLoginText = 'Encrypted persistent login found.<br>'
        document.getElementById('persistentLoginText').innerHTML = persistentLoginText
        updateDisplayByIDs(['persistentform'],['loginform','loginformmain-actions'])
        updateDisplayByIDs(['persistentform-actions'],[],'flex')
        displayPopup('loginPopup')
        if (isEncryptedStore('persistentLogin'))
            updateDisplayByIDs(['persistLoginPassword'],[])
        else
            updateDisplayByIDs([],['persistLoginPassword'])
    } else {
        updateDisplayByIDs(['loginform'],['persistentform'])
        displayPopup('loginPopup')
    }
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
    if (window.logins.blurtUser) cbUrl += '&blurtuser=' + window.logins.blurtUser
    if (window.logins.avalonHiveKeychain) cbUrl += '&avalonkc=' + window.logins.avalonHiveKeychain + '&avalonkcuser=' + window.logins.avalonHiveKeychainUser
    window.location.href = cbUrl
}

function loginBackBtn() {
    updateDisplayByIDs(['loginformmain'],['loginformhive','loginformhive-actions','loginformavalon','loginformavalon-actions','loginformblurt','loginformblurt-actions'])
    updateDisplayByIDs(['loginformmain-actions'],[],'flex')
}

function loginNetworkBtn(network) {
    if (!window.logins[network+'User']) {
        updateDisplayByIDs(['loginform'+network],['loginformmain','loginformmain-actions'])
        updateDisplayByIDs(['loginform'+network+'-actions'],[],'flex')
    }
}

function avalonKcToggle() {
    if (!avalonKcToggled) {
        if (!window.hive_keychain)
            return alert('Hive Keychain is not installed')
        updateDisplayByIDs(['avalonSignerUsername','avalonSignerRole'],['avalonLoginKey'])
        document.getElementById('avalonKcAuthBtn').value = 'Plaintext'
        avalonKcToggled = true
    } else {
        updateDisplayByIDs(['avalonLoginKey'],['avalonSignerUsername','avalonSignerRole'])
        document.getElementById('avalonKcAuthBtn').value = 'Keychain'
        avalonKcToggled = false
    }
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
    togglePopupActions('persistentform-actions',true)
    document.getElementById('proceedPersistAuthBtn').innerText = 'Logging In...'
    let storedDetails, persistentHiveAuth
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
    // HiveAuth specifics
    if (window.logins.hiveUser && !window.logins.hiveKey) {
        try {
            let ha = JSON.parse(localStorage.getItem('hiveAuth'))
            if (ha.username === window.logins.hiveUser)
                persistentHiveAuth = ha
        } catch {}
        if (persistentHiveAuth) {
            let challenge = {
                key_type: 'posting',
                challenge: ''
            }
            try {
                challenge.challenge = await generateMessageToSignPromise(window.logins.hiveUser,'hive')
            } catch {
                return handleLoginError('Challenge generation failed for HiveAuth login')
            }
            window.hiveauth.authenticate(window.logins.hiveAuth,APP_META,challenge,(evt) => {
                let payload = {
                    account: window.logins.hiveAuth.username,
                    uuid: evt.uuid,
                    key: evt.key,
                    host: HAS_SERVER
                }
                document.getElementById('persistenthiveauthqr').innerHTML = ''
                new QRCode(document.getElementById('persistenthiveauthqr'),'has://auth_req/'+btoa(JSON.stringify(payload)))
                updateDisplayByIDs(['persistenthiveauth'],[])
            }).then(res => {
                updateDisplayByIDs([],['persistenthiveauth'])
                localStorage.setItem('hiveAuth',JSON.stringify(window.logins.hiveAuth))
                keychainSigCb(challenge.challenge+':'+res.data.challenge.challenge,'hive',true,'Posting')
            }).catch(e => {
                updateDisplayByIDs([],['persistenthiveauth'])
                handleLoginError(HASError(e))
            })
            return
        } else
            return handleLoginError('Missing both hiveAuth and hiveKey?')
    }
    let network = storedDetails.tokenNetwork
    try {
        let msg = await generateMessageToSignPromise(storedDetails[network+'User'],network)
        let sig
        if (network === 'hive')
            sig = hivecryptpro.Signature.create(hivecryptpro.sha256(msg),storedDetails.hiveKey).customToString()
        else if (network === 'avalon')
            sig = hivecryptpro.Signature.avalonCreate(hivecryptpro.sha256(msg),storedDetails.avalonKey).customToString()
        msg += ':'+sig
        keychainSigCb(msg,network,true)
    } catch (e) {
        handleLoginError(e,network)
    }
}

function clearPersistentLogin() {
    localStorage.setItem('persistentLogin',null)
    window.logins = {}
    updateDisplayByIDs(['loginform'],['persistentform','persistentform-actions'])
    updateDisplayByIDs(['loginformmain-actions'])
}

function getPaymentInfo() {
    if (document.getElementById('gbdaysInput').value == '') return alert('Please specify GBdays to purchase.')
    let selectedNetwork = document.getElementById('signupNetwork').value
    let receipient = document.getElementById('receiverUsername').value
    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    let nativePymtProcessors = ['DTUBE','HIVE','HBD','BLURT']
    if (selectedNetwork === 'none') return alert('Please select a network for your account.')
    if (paymentMethod.startsWith('Select')) return alert('Please select a payment method.')

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
        amt = paymentMethod === 'DTUBE' ? amt.toFixed(2) : amt.toFixed(3)
        if (receipient) document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod
        updateDisplayByIDs(['nativeDisclaimer','xferMemo'],[])

        let memo = selectedNetwork === 'all' ? ('to: @' + receipient) : ('to: ' + selectedNetwork + '@' + receipient)
        if (selectedNetwork === 'all' && !receipient)
            memo = ''

        document.getElementById('xferMemo').innerHTML = memo !== '' ? 'Memo: <u>' + memo + '</u> <a onclick="copyToClipboard(\''+ memo + '\',\'copymemo\')"><i class="fas fa-clipboard tooltip" id="copybtn"><span class="tooltiptext" id="copymemo">Click to copy</span></i></a>' : 'No memo required'

        switch (paymentMethod) {
            case 'DTUBE':
                updateDisplayByIDs(['DTubeChannelBtn','dtcInstruction'],['HiveKeychainBtn','HiveSignerBtn','hiveRecPayment','BlurtKeychainBtn'])
                document.getElementById('DTubeChannelBtn').onclick = () => window.open('https://d.tube/#!/c/' + shawpconfig.DtcReceiver)
                document.getElementById('DTubeChannelBtn').href = 'https://d.tube/#!/c/' + shawpconfig.DtcReceiver
                break
            case 'HIVE':
            case 'HBD':
                hivePaymentClickListener(receipient,shawpconfig.HiveReceiver,amt,paymentMethod,memo,'signup')
                break
            case 'BLURT':
                blurtPaymentClickListener(receipient,shawpconfig.BlurtReceiver,amt,paymentMethod,memo,'signup')
                break
            default:
                break
        }

        updateDisplayByIDs(['signuppay'],['signupstart','pymtstart-actions'])
        updateDisplayByIDs(['pymtpay-actions'],[],'flex')
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
    let hiveUsername = document.getElementById('hiveLoginUsername').value.toLowerCase().replace('@','')
    let hiveKey = document.getElementById('hiveLoginKey').value

    if (!hiveUsername) return alert('Username is required')
    if (!window.hive_keychain && !isElectron()) return alert('Hive Keychain is not installed')
    if (!hiveKey && isElectron()) return alert('Posting key is required')

    togglePopupActions('loginformhive-actions',true)

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
            localStorage.removeItem('hiveAuth')
            keychainCb(t,'hive')
        } else hive_keychain.requestVerifyKey(hiveUsername,response.data.encrypted_memo,'Posting',(loginResponse) => {
            if (loginResponse.error != null)
                return handleLoginError(loginResponse.message,'hive')
            sessionStorage.setItem('hiveUser',hiveUsername)
            localStorage.removeItem('hiveAuth')
            keychainCb(loginResponse.result.substr(1),'hive')
        })
    }).catch((e) => {
        axiosErrorHandler(e)
        handleLoginError('','hive')
    })
}

async function hiveAuthLogin() {
    let hiveUsername = document.getElementById('hiveLoginUsername').value.toLowerCase().replace('@','')
    if (!hiveUsername) return alert('Username is required')
    try {
        if (!(await axios.get('/checkuser?network=hive&user='+hiveUsername)).data.isInWhitelist)
            return alert('Uploader access denied')
    } catch (e) {
        return alert('User whitelist check failed')
    }
    let challenge = {
        key_type: 'posting',
        challenge: ''
    }
    window.logins.hiveAuth = {
        username: hiveUsername
    }
    try {
        challenge.challenge = await generateMessageToSignPromise(hiveUsername,'hive')
    } catch (e) {
        return alert('Challenge generation failed')
    }
    let persistedHiveAuth = localStorage.getItem('hiveAuth')
    try {
        persistedHiveAuth = JSON.parse(persistedHiveAuth)
        if (persistedHiveAuth.username === hiveUsername && persistedHiveAuth.expire > new Date().getTime())
            window.logins.hiveAuth = persistedHiveAuth
    } catch (e) {}
    window.hiveauth.authenticate(window.logins.hiveAuth,APP_META,challenge,(evt) => {
        let payload = {
            account: window.logins.hiveAuth.username,
            uuid: evt.uuid,
            key: evt.key,
            host: HAS_SERVER
        }
        document.getElementById('hiveauthqr').innerHTML = ''
        new QRCode(document.getElementById('hiveauthqr'),'has://auth_req/'+window.btoa(JSON.stringify(payload)))
        updateDisplayByIDs(['loginformhiveauth'],['loginformhive','loginformhive-actions'])
    }).then((res) => {
        sessionStorage.setItem('hiveUser',hiveUsername)
        localStorage.setItem('hiveAuth',JSON.stringify(window.logins.hiveAuth))
        keychainSigCb(challenge.challenge+':'+res.data.challenge.challenge,'hive',false,'Posting')
    }).catch((e) => {
        alert(HASError(e))
        updateDisplayByIDs(['loginformhive'],['loginformhiveauth'])
        updateDisplayByIDs(['loginformhive-actions'],[],'flex')
    })
}

function keychainCb(encrypted_message,network,persistence) {
    axios.post('/logincb',encrypted_message,{ headers: { 'Content-Type': 'text/plain' }}).then((cbResponse) => {
        if (cbResponse.data.error != null) {
            alert(cbResponse.data.error)
        } else {
            console.log(cbResponse.data)
            keychainPostCall(cbResponse.data.access_token,network,persistence)
        }
    }).catch((err) => {
        if (err.response.data.error)
            handleLoginError(err.response.data.error,network)
        else
            handleLoginError(err,network)
    }).finally(() => togglePopupActions('loginform'+network+'-actions',false))
}

function keychainSigCb(message,network,persistence,role = 'Posting') {
    axios.post('/loginsig',message,{ headers: { 'Content-Type': 'text/plain' }}).then((cbResponse) => {
        if (cbResponse.data.error != null) {
            alert(cbResponse.data.error)
        } else {
            console.log(cbResponse.data)
            keychainPostCall(cbResponse.data.access_token,network,persistence,role)
        }
    }).catch((err) => {
        if (err.response.data.error)
            handleLoginError(err.response.data.error,network)
        else
            handleLoginError(err,network)
    }).finally(() => togglePopupActions('loginform'+network+'-actions',false))
}

function keychainPostCall(token,network,persistence,role) {
    if (isElectron() && persistence) {
        window.logins.token = token
        window.logins.tokenNetwork = network
        window.logins.keychain = true
        proceedLogin()
    } else
        loginCb(network,token,false,role)
}

function loginCb(network,token,oauth2,role) {
    if (!window.logins.token && token) {
        window.logins.token = token
        window.logins.tokenNetwork = network
        window.logins.keychain = !oauth2
    }
    if (!oauth2) {
        window.logins[network+'User'] = document.getElementById(network+'LoginUsername').value.toLowerCase().replace('@','')
        window.logins[network+'Key'] = document.getElementById(network+'LoginKey').value
    }
    if (avalonKcToggled && network === 'avalon') {
        window.logins.avalonHiveKeychain = role
        window.logins.avalonHiveKeychainUser = document.getElementById('avalonSignerUsername').value
        sessionStorage.setItem('avalonUser',window.logins.avalonUser)
    }
    togglePopupActions('loginform'+network+'-actions',false)
    updateDisplayByIDs(['loginformmain'],['loginform'+network,'loginform'+network+'-actions','loginformhiveauth'])
    updateDisplayByIDs(['loginformmain-actions'],[],'flex')
    document.getElementById('loginnetwork'+network).innerHTML = '<h5 id="loginnetwork'+network+'username"></h5>'
    document.getElementById('loginnetwork'+network+'username').innerText = window.logins[network+'User']
}

async function avalonLogin() {
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value
    let msg

    togglePopupActions('loginformavalon-actions',true)

    try {
        msg = await generateMessageToSignPromise(avalonUsername,'dtc')
    } catch (e) {
        return handleLoginError(e,'avalon')
    }

    if (avalonKcToggled) {
        let signerUsername = document.getElementById('avalonSignerUsername').value
        let signerRole = document.getElementById('avalonSignerRole').value
        hive_keychain.requestSignBuffer(signerUsername,msg,signerRole,(signResult) => {
            if (signResult.error)
                return handleLoginError(signResult.error,'avalon')
            msg += ':'+signResult.result
            keychainSigCb(msg,'avalon',false,signerRole)
        })
        return
    }
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
        let sig = hivecryptpro.Signature.avalonCreate(hivecryptpro.sha256(msg),avalonKey).customToString()
        msg += ':'+sig
        console.log(msg)
        keychainSigCb(msg,'avalon',false)
    }
}

async function blurtLogin() {
    let blurtUsername = document.getElementById('blurtLoginUsername').value.toLowerCase().replace('@','')
    let blurtKey = document.getElementById('blurtLoginKey').value

    if (!blurtUsername) return alert('Username is required')
    if (!window.blurt_keychain && !isElectron()) return alert('Blurt Keychain is not installed')
    if (!blurtKey && isElectron()) return alert('Posting key is required')

    togglePopupActions('loginformblurt-actions',true)

    if (isElectron()) {
        try {
            let login = await blurtKeyLogin('blurt',blurtUsername,blurtKey,'BLT')
            if (typeof login === 'string')
                throw login
        } catch (e) {
            alert(e.toString())
            togglePopupActions('loginformblurt-actions',false)
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
                togglePopupActions('loginformblurt-actions',false)
                return
            }
        })
    }
}

async function blurtKeyLogin(network,username,wif,prefix='BLT') {
    try {
        let acc = await getGrapheneAccounts(network,[username])
        if (acc.length == 0) return 'Account does not exist'
        try {
            let pubkey = hivecryptpro.PrivateKey.fromString(wif).createPublic().toString()
            if (prefix !== 'BLT')
                pubkey = pubkey.replace('BLT',prefix)
            for (let i = 0; i < acc[0].posting.key_auths.length; i++)
                if (acc[0].posting.key_auths[i][0].toString() === pubkey.toString())
                    return true
            return 'Invalid username or posting key'
        } catch (err) { return 'Invalid username or posting key' }
    } catch {
        return 'Failed to fetch account'
    }
}

function storeEncrypted(key,value,password) {
    let pubK = hivecryptpro.PrivateKey.fromPassword('',password,'Posting').createPublic().toString()
    let wif = hivecrypt.randomWif()
    localStorage.setItem(key,hivecryptpro.hivecrypt.encode(wif,pubK,'#'+value.toString()))
}

function retrieveEncrypted(key,password) {
    let wif = hivecryptpro.PrivateKey.fromPassword('',password,'Posting').toString()
    let enc = localStorage.getItem(key)
    if (!enc.startsWith('#')) return enc
    try {
        let result = hivecryptpro.hivecrypt.decode(wif,enc).substr(1)
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
    togglePopupActions('loginform'+network+'-actions',false)
    togglePopupActions('persistentform-actions',false)
    if (msg) alert(msg)
}

function updateRememberMeState() {
    if (document.getElementById('rememberme').checked)
        updateDisplayByIDs(['persistPassword'],[])
    else
        updateDisplayByIDs([],['persistPassword'])
}