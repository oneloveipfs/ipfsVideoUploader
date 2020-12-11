let config, shawpconfig

document.addEventListener('DOMContentLoaded', () => {
    let url = new URL(window.location.href)
    if (url.searchParams.get('callback') == 'signupstart')
        updateDisplayByIDs(['signupstart','signupPopup'],['signupcancel','signupcb'])
    else if (url.searchParams.get('callback') == 'signupcancel')
        updateDisplayByIDs(['signupcancel','signupPopup'],['signupstart'])
    else if (url.searchParams.get('callback') == 'signupcb')
        updateDisplayByIDs(['signupcb','signupPopup'],['signupstart'])

    if (!isElectron()) {
        updateDisplayByIDs([],['loginHiveKey','loginSteemKey'])
        let tohide = document.getElementsByClassName('rememberme')
        for (let i = 0; i < tohide.length; i++)
            tohide[i].style.display = "none"
    } else {
        document.getElementById('logininfo').innerText = 'Login with your posting or custom keys. COMMENT authority is required at minimum for Avalon custom keys. Private keys are only stored on your computer and will only be used to decrypt access tokens and broadcast transactions.'
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
            else if ((paymentOptions[i].value == "STEEM" || paymentOptions[i].value == "SBD") && !shawpconfig.SteemReceiver)
                paymentOptions[i].disabled = true
            else if (paymentOptions[i].value == "Coinbase" && !shawpconfig.Coinbase.enabled)
                paymentOptions[i].disabled = true
        }

        if (shawpconfig.Coinbase.enabled) {
            let signupStartText = document.getElementById('signupstart').children[0]
            signupStartText.innerHTML += ' You can also pay with '

            for (let i = 0; i < shawpconfig.Coinbase.enabledCurrencies.length; i++) {
                signupStartText.innerHTML += shawpconfig.Coinbase.enabledCurrencies[i]
                if (i < shawpconfig.Coinbase.enabledCurrencies.length - 2)
                    signupStartText.innerHTML += ', '
                else if (i < shawpconfig.Coinbase.enabledCurrencies.length - 1)
                    signupStartText.innerHTML += ' and '
            }
            signupStartText.innerHTML += ' through Coinbase commerce.'
        }
    })

    window.keychainLoginBtn = document.getElementById('proceedAuthBtn')
    window.proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
    document.getElementById('authButton').onclick = loginBtnClicked
    document.getElementById('authButton2').onclick = loginBtnClicked

    document.getElementById('loginUsername').onchange = () => document.getElementById('proceedAuthBtn').innerText = getKeychainLoginBtnLabel()
    document.getElementById('loginSteemUsername').onchange = () => document.getElementById('proceedAuthBtn').innerText = getKeychainLoginBtnLabel()

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
        try {
            storedLogin = JSON.parse(localStorage.getItem('persistentLogin'))
            if ((!storedLogin.dtcUser && !storedLogin.hiveUser && !storedLogin.steemUser) || 
                (storedLogin.dtcUser && !storedLogin.dtcKey) || 
                (storedLogin.hiveUser && !storedLogin.hiveKey) || 
                (storedLogin.steemUser && !storedLogin.steemKey)) throw 'invalid keys'
        } catch {
            return updateDisplayByIDs(['loginPopup'],[])
        }
        let persistentLoginText = '<h4>Persistent login found.<br>'
        if (storedLogin.hiveUser) persistentLoginText += '<br>Hive: ' + storedLogin.hiveUser
        if (storedLogin.steemUser) persistentLoginText += '<br>Steem: ' + storedLogin.steemUser
        if (storedLogin.dtcUser) persistentLoginText += '<br>Avalon: ' + storedLogin.dtcUser
        document.getElementById('persistentLoginText').innerHTML = persistentLoginText
        updateDisplayByIDs(['persistentform','loginPopup'],['loginform'])
    } else updateDisplayByIDs(['loginPopup'],[])
}

document.getElementById('proceedAuthBtn').onclick = async function proceedLogin() {
    if (window.proceedAuthBtnDisabled == true) return

    let username = document.getElementById('loginUsername').value.toLowerCase().replace('@','')
    let steemUsername = document.getElementById('loginSteemUsername').value.toLowerCase().replace('@','')
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value
    let hiveKey = document.getElementById('loginHiveKey').value
    let steemKey = document.getElementById('loginSteemKey').value

    if (username == '' && avalonUsername == '') return alert('Hive or Avalon username is required')
    if (!window.hive_keychain && username !== '' && !isElectron()) return alert('Hive Keychain is not installed')
    if (!window.steem_keychain && steemUsername != '' && !isElectron()) return alert('Steem Keychain is not installed')
    keychainLoginBtn.innerText = "Logging In..."
    proceedAuthBtnDisabled = true

    // Avalon login
    await avalonLogin(avalonUsername,avalonKey,!username)

    // Keychain login
    // Using public posting key on Hive to initiate login
    let loginUrl = '/login?network=hive&user='+username
    if (isElectron() && !window.hive_keychain) loginUrl += '&hivecrypt=1'
    if (username) axios.get(loginUrl).then((response) => {
        if (response.data.error != null)
            return handleLoginError(response.data.error)
        else if (isElectron()) {
            handleElectronLogins(response.data.encrypted_memo,steemUsername,steemKey,username,hiveKey,avalonUsername,avalonKey,false)
        } else hive_keychain.requestVerifyKey(username,response.data.encrypted_memo,'Posting',(loginResponse) => {
            if (loginResponse.error != null)
                return handleLoginError(loginResponse.message)
            
            if (steemUsername != '')
                steem_keychain.requestSignBuffer(steemUsername,'login','Posting',(steemLoginRes) => {
                    console.log('Steem Keychain response',steemLoginRes)
                    if (steemLoginRes.success)
                        keychainCb(loginResponse.result.substr(1),steemUsername,false)
                    else {
                        alert('Steem Keychain login error: ' + steemLoginRes.message)
                        keychainCb(loginResponse.result.substr(1),'',false)
                    }
                })
            else
                keychainCb(loginResponse.result.substr(1),'',false)
        })
    }).catch((err) => handleLoginError(err && err.response && err.response.data ? err.response.data.error : err))
}

document.getElementById('altAuthBtn').onclick = () => {
    // HiveSigner login (plus SteemLogin dual?)
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    avalonLogin(avalonUsername,avalonKey,false)

    let hiveClient = new hivesigner.Client({
        app: config.HiveSignerApp,
        callbackURL: config.callbackURL,
        scope: ['comment','comment_options']
    })

    hiveClient.login({},(err,token) => {
        console.log('HiveSigner',err,token)
    })
}

document.getElementById('proceedPersistAuthBtn').onclick = async () => {
    if (proceedAuthBtnDisabled) return
    proceedAuthBtnDisabled = true
    document.getElementById('proceedPersistAuthBtn').innerText = 'Logging In...'
    let storedDetails = JSON.parse(localStorage.getItem('persistentLogin'))
    await avalonLogin(storedDetails.dtcUser,storedDetails.dtcKey,!storedDetails.hiveUser && !storedDetails.steemUser)
    axios.get('/login?network=hive&hivecrypt=1&user='+storedDetails.hiveUser).then((r) => {
        if (r.data.error != null)
            return handleLoginError(r.data.error)
        handleElectronLogins(r.data.encrypted_memo,storedDetails.steemUser,storedDetails.steemKey,storedDetails.hiveUser,storedDetails.hiveKey,storedDetails.dtcUser,storedDetails.dtcKey,true)
    })
}

document.getElementById('clearPersistAuthBtn').onclick = () => {
    localStorage.setItem('persistentLogin',null)
    updateDisplayByIDs(['loginform'],['persistentform'])
}

document.getElementById('signupButton').onclick = () => {
    updateDisplayByIDs(['signupPopup'],[])
}

document.getElementById('getPaymentBtns').onclick = () => {
    if (document.getElementById('gbdaysInput').value == '') return alert('Please specify GBdays to purchase.')
    let selectedNetwork = document.getElementById('signupNetwork').value
    let receipient = document.getElementById('receiverUsername').value
    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    let nativePymtProcessors = ['HIVE','HBD','STEEM','SBD']
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
        amt = amt.toFixed(3)
        if (receipient) document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod
        updateDisplayByIDs(['nativeDisclaimer'],['CoinbaseCommerceBtn','coinbaseDisclaimer'])

        let memo = selectedNetwork === 'all' ? ('to: @' + receipient) : ('to: ' + selectedNetwork + '@' + receipient)
        if (selectedNetwork === 'all' && !receipient)
            memo = ''

        switch (paymentMethod) {
            case 'HIVE':
            case 'HBD':
                updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn'],['SteemKeychainBtn','SteemLoginBtn'])
                document.getElementById('HiveKeychainBtn').onclick = () => {
                    hive_keychain.requestTransfer(receipient,shawpconfig.HiveReceiver,amt.toString(),memo,paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        updateDisplayByIDs(['signupcb'],['signuppay'])
                    })
                }
                document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + (memo !== '' ? '&memo=' + memo : '')
                break
            case 'STEEM':
            case 'SBD':
                updateDisplayByIDs(['SteemKeychainBtn','SteemLoginBtn'],['HiveKeychainBtn','HiveSignerBtn'])
                document.getElementById('SteemKeychainBtn').onclick = () => {
                    steem_keychain.requestTransfer(receipient,shawpconfig.SteemReceiver,amt.toString(),memo,paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        updateDisplayByIDs(['signupcb'],['signuppay'])
                    })
                }
                document.getElementById('SteemLoginBtn').href = 'https://steemlogin.com/sign/transfer?to=' + shawpconfig.SteemReceiver + '&amount=' + amt + paymentMethod + (memo !== '' ? '&memo=' + memo : '')
                break
            default:
                break
        }

        updateDisplayByIDs(['signuppay'],['signupstart'])
    })
    else if (paymentMethod == 'Coinbase') {
        let fiatAmt = Math.round(creditsToBuy * shawpconfig.DefaultUSDRate * 100) / 100
        let roundedCredits = (fiatAmt / shawpconfig.DefaultUSDRate).toFixed(6)
        document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + roundedCredits + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: $' + fiatAmt + ' USD'

        updateDisplayByIDs(['CoinbaseCommerceBtn','coinbaseDisclaimer','signuppay'],['signupstart','HiveKeychainBtn','HiveSignerBtn','SteemKeychainBtn','SteemLoginBtn','nativeDisclaimer'])
        
        document.getElementById('CoinbaseCommerceBtn').onclick = () =>
            axios.post('/shawp_refill_coinbase',{ username: receipient, network: selectedNetwork, usdAmt: fiatAmt })
                .then((response) => window.location.href = response.data.hosted_url)
                .catch((e) => alert(JSON.stringify(e)))
    }
}

document.getElementById('redeemVoucherBtn').onclick = () => {
    alert('Invalid voucher code')
}
})

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

function keychainCb(encrypted_message,steemUser,dtconly) {
    let contentType = {
        headers: {
            "content-type": "text/plain",
        },
    }

    axios.post('/logincb',encrypted_message,contentType).then((cbResponse) => {
        if (cbResponse.data.error != null) {
            alert(cbResponse.data.error)
        } else {
            let cbUrl = '/upload?access_token=' + cbResponse.data.access_token + '&keychain=true'
            if (steemUser != '') cbUrl += '&steemuser=' + steemUser
            if (dtconly) cbUrl += '&dtconly=true'
            window.location.href = cbUrl
        }
    }).catch((err) => {
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
    })
}

async function avalonLogin(avalonUsername,avalonKey,dtconly) {
    if (avalonUsername !== '' && avalonKey !== '') {
        let avalonKeyId = false
        try {
            avalonKeyId = await getAvalonKeyId(avalonUsername,avalonKey)
            if (avalonKeyId === false) {
                keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
                proceedAuthBtnDisabled = false
                return alert('Avalon key is invalid!')
            }
        } catch (e) {
            keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
            proceedAuthBtnDisabled = false
            return alert('Avalon login error: ' + e)
        }
        
        // Storing Avalon login in sessionStorage so that we can access this in the upload page to sign transactions later.
        sessionStorage.setItem('dtcUser',avalonUsername)
        sessionStorage.setItem('dtcKey',avalonKey)

        if (dtconly) {
            let loginGetUrl = '/login?user=' + avalonUsername + '&dtc=true'
            if (avalonKeyId && avalonKeyId !== true) loginGetUrl += '&dtckeyid=' + avalonKeyId
            axios.get(loginGetUrl).then((response) => {
                if (response.data.error != null)
                    return alert(response.data.error)
                javalon.decrypt(avalonKey,response.data.encrypted_memo,(e,decryptedAES) => {
                    if (e) {
                        keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
                        proceedAuthBtnDisabled = false
                        return alert('Avalon decrypt error: ' + e.error)
                    }
                    keychainCb(decryptedAES,'',true)
                })
            }).catch(axiosErrorHandler)
        }
    } else {
        // If Avalon username or password not provided, clear existing login (if any) from sessionStorage
        sessionStorage.clear()
    }
}

function steemKeyLogin(username,wif) {
    return new Promise((rs,rj) => {
        steem.api.getAccounts([username],(e,acc) => {
            if (e || acc.length == 0) return rj(e)
            try {
                pubkey = steem.auth.wifToPublic(wif)
                for (let i = 0; i < acc[0].posting.key_auths.length; i++)
                    if (acc[0].posting.key_auths[i][0].toString() === pubkey.toString())
                        return rs(true)
                rj('Invalid Steem username or posting key')
            } catch (err) { return rj('Invalid Steem username or posting key') }
        })
    })
}

async function handleElectronLogins(memo,steemUsername,steemKey,hiveUsername,hiveKey,avalonUsername,avalonKey,fromPersistence) {
    // Use posting keys to decrypt for Electron app
    let usingSteem = false
    let token
    try {
        token = hivecrypt.decode(hiveKey,memo).substr(1)
    } catch {
        return handleLoginError('Unable to decode access token with Hive posting key')
    }

    if (steemUsername && steemKey) try {
        await steemKeyLogin(steemUsername,steemKey)
        usingSteem = true
    } catch {
        alert('Invalid Steem key, proceeding with Hive/Avalon login only')
    }

    // Store private keys in session storage to be used later
    sessionStorage.setItem('hiveUser',hiveUsername)
    sessionStorage.setItem('hiveKey',hiveKey)

    if (usingSteem) {
        sessionStorage.setItem('steemUser',steemUsername)
        sessionStorage.setItem('steemKey',steemKey)
    }

    if (document.getElementById('rememberme').checked && !fromPersistence)
        localStorage.setItem('persistentLogin',JSON.stringify({
            hiveUser: hiveUsername,
            hiveKey: hiveKey,
            steemUser: steemUsername,
            steemKey: steemKey,
            dtcUser: avalonUsername,
            dtcKey: avalonKey
        }))

    keychainCb(token,steemUsername,false)
}

function handleLoginError(msg) {
    keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
    document.getElementById('proceedPersistAuthBtn').innerText = 'Proceed'
    proceedAuthBtnDisabled = false
    alert(msg)
}

function getKeychainLoginBtnLabel() {
    if (isElectron()) return "Proceed"
    let hiveUsername = document.getElementById('loginUsername').value
    let steemUsername = document.getElementById('loginSteemUsername').value
    if (hiveUsername || steemUsername)
        return "Proceed with Keychains"
    else
        return "Proceed"
}