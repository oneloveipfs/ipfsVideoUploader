let config, shawpconfig

document.addEventListener('DOMContentLoaded', () => {
    let url = new URL(window.location.href)
    if (url.searchParams.get('callback') == 'signupstart')
        updateDisplayByIDs(['signupstart','signupPopup'],['signupcancel','signupcb'])
    else if (url.searchParams.get('callback') == 'signupcancel')
        updateDisplayByIDs(['signupcancel','signupPopup'],['signupstart'])
    else if (url.searchParams.get('callback') == 'signupcb')
        updateDisplayByIDs(['signupcb','signupPopup'],['signupstart'])

    axios.get('/config').then((result) => {
        config = result.data

        if (!config.hivesignerEnabled) {
            let tohide = document.getElementsByClassName("sclogin")
            for (let i = 0; i < tohide.length; i++) {
                tohide[i].style.display = "none"
            }
        }
    })

    axios.get('/shawp_config').then((result) => {
        shawpconfig = result.data
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

    let proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
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
    // if (!window.steem_keychain) updateDisplayByIDs([],['loginSteemUsername','sameSteemUser'])
    // if (!window.hive_keychain) updateDisplayByIDs([],['loginUsername','sameSteemUser','sameAvalonUser'])
    updateDisplayByIDs(['loginPopup'],[])
}

document.getElementById('proceedAuthBtn').onclick = async function proceedLogin() {
    if (proceedAuthBtnDisabled == true) return

    let useSteem = false
    let keychainLoginBtn = document.getElementById('proceedAuthBtn')
    let username = document.getElementById('loginUsername').value.toLowerCase().replace('@','')
    let steemUsername = document.getElementById('loginSteemUsername').value.toLowerCase().replace('@','')
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    if (username == '' && avalonUsername == '') return alert('Hive or Avalon username is required')
    if (!window.hive_keychain && username !== '') return alert('Hive Keychain is not installed')
    if (!window.steem_keychain && steemUsername != '') return alert('Steem Keychain is not installed')

    if (steemUsername != '') {
        useSteem = true
        steem_keychain.requestHandshake(() => console.log('Steem Keychain Handshake received!'))
    }

    if (username !== '') hive_keychain.requestHandshake(() => console.log('Hive Keychain Handshake received!'))
    keychainLoginBtn.innerText = "Logging In..."
    proceedAuthBtnDisabled = true

    // Avalon login
    avalonLogin(avalonUsername,avalonKey,!username)

    // Keychain login
    // Using public posting key on Hive to initiate login
    if (username) axios.get('/login?user=' + username).then((response) => {
        if (response.data.error != null) {
            keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
            proceedAuthBtnDisabled = false
            return alert(response.data.error)
        }
        hive_keychain.requestVerifyKey(username,response.data.encrypted_memo,'Posting',(loginResponse) => {
            console.log(loginResponse)
            if (loginResponse.error != null) { 
                keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
                proceedAuthBtnDisabled = false
                return alert(loginResponse.message)
            }

            if (steemUsername != '')
                steem_keychain.requestSignBuffer(steemUsername,'login','Posting',(steemLoginRes) => {
                    console.log('Steem Keychain response',steemLoginRes)
                    if (steemLoginRes.success)
                        keychainCb(loginResponse.result.substr(1),steemUsername,false)
                    else {
                        alert('Steem Keychain login error: ' + steemLoginRes.error)
                        keychainCb(loginResponse.result.substr(1),'',false)
                    }
                })
            else
                keychainCb(loginResponse.result.substr(1),'',false)
        })
    }).catch((err) => {
        keychainLoginBtn.innerText = getKeychainLoginBtnLabel()
        proceedAuthBtnDisabled = false
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
    })
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

document.getElementById('signupButton').onclick = () => {
    updateDisplayByIDs(['signupPopup'],[])
}

document.getElementById('getPaymentBtns').onclick = () => {
    if (document.getElementById('gbdaysInput').value == '') return alert('Please specify GBdays to purchase.')
    let receipient = document.getElementById('receiverUsername').value
    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    let nativePymtProcessors = ['HIVE','HBD','STEEM','SBD']
    if (receipient && validateAccountName(receipient) !== null) return alert(validateAccountName(receipient))
    if (creditsToBuy <= 0) return alert('Purchase quantity must not be less than or equals to zero.')
    if (nativePymtProcessors.includes(paymentMethod)) exchageRate(paymentMethod,creditsToBuy,(e,amt) => {
        if (e) return alert(e)
        amt = amt.toFixed(3)
        if (receipient) document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod
        updateDisplayByIDs(['nativeDisclaimer'],['CoinbaseCommerceBtn','coinbaseDisclaimer'])

        switch (paymentMethod) {
            case 'HIVE':
            case 'HBD':
                updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn'],['SteemKeychainBtn','SteemLoginBtn'])
                document.getElementById('HiveKeychainBtn').onclick = () => {
                    hive_keychain.requestTransfer(receipient,shawpconfig.HiveReceiver,amt.toString(),receipient ? 'to: @' + receipient : '',paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        updateDisplayByIDs(['signupcb'],['signuppay'])
                    })
                }
                document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + (receipient ? '&memo=to: @' + receipient : '')
                break
            case 'STEEM':
            case 'SBD':
                updateDisplayByIDs(['SteemKeychainBtn','SteemLoginBtn'],['HiveKeychainBtn','HiveSignerBtn'])
                document.getElementById('SteemKeychainBtn').onclick = () => {
                    steem_keychain.requestTransfer(receipient,shawpconfig.SteemReceiver,amt.toString(),receipient ? 'to: @' + receipient : '',paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        updateDisplayByIDs(['signupcb'],['signuppay'])
                    })
                }
                document.getElementById('SteemLoginBtn').href = 'https://steemlogin.com/sign/transfer?to=' + shawpconfig.SteemReceiver + '&amount=' + amt + paymentMethod + (receipient ? '&memo=to: @' + receipient : '')
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
            axios.post('/shawp_refill_coinbase',{ username: receipient, usdAmt: fiatAmt })
                .then((response) => window.location.href = response.data.hosted_url)
                .catch((e) => alert(JSON.stringify(e)))
    }
}

document.getElementById('redeemVoucherBtn').onclick = () => {
    alert('Invalid voucher code')
}
})

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
        let avalonKeyId
        let avalonLoginPromise = new Promise((resolve,reject) => {
            javalon.getAccount(avalonUsername,(err,result) => {
                if (err) return reject(err)
                let avalonPubKey = javalon.privToPub(avalonKey)
                if (result.pub === avalonPubKey) return resolve(true)

                // Login with "Posting key" (recommended)
                for (let i = 0; i < result.keys.length; i++) {
                    if (arrContainsInt(result.keys[i].types,4) === true && result.keys[i].pub === avalonPubKey) {
                        avalonKeyId = result.keys[i].id
                        return resolve(true)
                    }
                }
                resolve(false)
            })
        })
        
        try {
            let avalonLoginResult = await avalonLoginPromise
            if (avalonLoginResult != true) {
                return alert('Avalon key is invalid!')
            }
        } catch (e) {
            return alert('Avalon login error: ' + e)
        }
        
        // Storing Avalon login in sessionStorage so that we can access this in the upload page to sign transactions later.
        sessionStorage.setItem('OneLoveAvalonUser',avalonUsername)
        sessionStorage.setItem('OneLoveAvalonKey',avalonKey)

        if (dtconly) {
            let loginGetUrl = '/login?user=' + avalonUsername + '&dtc=true'
            if (avalonKeyId || avalonKeyId === '') loginGetUrl += '&dtckeyid=' + avalonKeyId
            axios.get(loginGetUrl).then((response) => {
                if (response.data.error != null)
                    return alert(response.data.error)
                javalon.decrypt(avalonKey,response.data.encrypted_memo,(e,decryptedAES) => {
                    if (e) {
                        return alert('Avalon decrypt error: ' + e.error)
                    }
                    keychainCb(decryptedAES,'',true)
                })
            }).catch((e) => {
                if (e.response.data.error) alert(e.response.data.error)
                else alert(JSON.stringify(e))
            })
        }
    } else {
        // If Avalon username or password not provided, clear existing login (if any) from sessionStorage
        sessionStorage.clear()
    }
}

function getKeychainLoginBtnLabel() {
    let hiveUsername = document.getElementById('loginUsername').value
    let steemUsername = document.getElementById('loginSteemUsername').value
    if (hiveUsername || steemUsername)
        return "Proceed with Keychains"
    else
        return "Proceed"
}

function exchageRate (coin,amount,cb) {
    switch (coin) {
        case 'DTC':
            // DTC payments coming soon
            break
        case 'HIVE':
            axios.get('https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'HBD':
            axios.get('https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'STEEM':
            axios.get('https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'SBD':
            axios.get('https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        default:
            break
    }
}

function validateAccountName(value) {
    var i = void 0,
        label = void 0,
        len = void 0,
        suffix = void 0;
  
    suffix = "Hive username must ";
    if (!value) {
        return suffix + "not be empty.";
    }
    var length = value.length;
    if (length < 3 || length > 16) {
        return suffix + "be between 3 and 16 characters.";
    }
    if (/\./.test(value)) {
        suffix = "Each account segment much ";
    }
    var ref = value.split(".");
    for (i = 0, len = ref.length; i < len; i++) {
        label = ref[i];
        if (!/^[a-z]/.test(label)) {
            return suffix + "start with a letter.";
        }
        if (!/^[a-z0-9-]*$/.test(label)) {
            return suffix + "have only letters, digits, or dashes.";
        }
        if (/--/.test(label)) {
            return suffix + "have only one dash in a row.";
        }
        if (!/[a-z0-9]$/.test(label)) {
            return suffix + "end with a letter or digit.";
        }
        if (!(label.length >= 3)) {
            return suffix + "be longer";
        }
    }
    return null;
}

function arrContainsInt(arr,value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true
    }
}

function updateDisplayByIDs(toshow,tohide) {
    for (let i = 0; i < tohide.length; i++)
        document.getElementById(tohide[i]).style.display = 'none'
    
    for (let i = 0; i < toshow.length; i++)
        document.getElementById(toshow[i]).style.display = 'block'
}