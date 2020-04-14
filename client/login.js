let config
let shawpconfig

document.addEventListener('DOMContentLoaded', () => {
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
    })

    let proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
    document.getElementById('authButton').onclick = function loginBtnClicked() {
        // Show popup window of login options
        document.getElementById('loginPopup').style.display = "block"
    }

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

document.getElementById('proceedAuthBtn').onclick = async function proceedLogin() {
    if (proceedAuthBtnDisabled == true) return

    let useSteem = false
    let keychainLoginBtn = document.getElementById('proceedAuthBtn')
    let username = document.getElementById('loginUsername').value.toLowerCase().replace('@','')
    let steemUsername = document.getElementById('loginSteemUsername').value.toLowerCase().replace('@','')
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    if (username == '') return alert('Hive username is required')
    if (!window.hive_keychain) return alert('Hive Keychain is not installed')
    if (!window.steem_keychain && steemUsername != '') return alert('Steem Keychain is not installed')

    if (steemUsername != '') {
        useSteem = true
        steem_keychain.requestHandshake(() => console.log('Steem Keychain Handshake received!'))
    }

    hive_keychain.requestHandshake(() => console.log('Hive Keychain Handshake received!'))
    keychainLoginBtn.innerText = "Logging In..."
    proceedAuthBtnDisabled = true

    // Avalon login
    avalonLogin(avalonUsername,avalonKey)

    // Keychain login
    // Using public posting key on Hive to initiate login
    axios.get('/login?user=' + username).then((response) => {
        if (response.data.error != null) {
            alert(response.data.error)
            return
        }
        hive_keychain.requestVerifyKey(username,response.data.encrypted_memo,'Posting',(loginResponse) => {
            console.log(loginResponse)
            if (loginResponse.error != null) return alert(loginResponse.message)

            if (steemUsername != '')
                steem_keychain.requestSignBuffer(steemUsername,'login','Posting',(steemLoginRes) => {
                    console.log('Steem Keychain response',steemLoginRes)
                    if (steemLoginRes.success)
                        keychainCb(loginResponse,steemUsername)
                    else {
                        alert('Steem Keychain login error: ' + steemLoginRes.error)
                        keychainCb(loginResponse,'')
                    }
                })
            else
                keychainCb(loginResponse,'')
        })
    }).catch((err) => {
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
    })
}

document.getElementById('altAuthBtn').onclick = () => {
    // HiveSigner login (plus SteemConnect dual?)
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    avalonLogin(avalonUsername,avalonKey)

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
    document.getElementById('signupPopup').style.display = "block"
}

document.getElementById('getPaymentBtns').onclick = () => {
    let receipient = document.getElementById('receiverUsername').value
    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    if (receipient && validateAccountName(receipient) !== null) return alert(validateAccountName(receipient))
    if (creditsToBuy <= 0) return alert('Purchase quantity must not be less than or equals to zero.')
    exchageRate(paymentMethod,creditsToBuy,(e,amt) => {
        if (e) return alert(e)
        if (receipient) document.getElementById('receiverAccConfirm').innerText = 'Username: ' + receipient
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod

        switch (paymentMethod) {
            case 'HIVE':
            case 'HBD':
                document.getElementById('SteemKeychainBtn').style.display = 'none'
                document.getElementById('SteemLoginBtn').style.display = 'none'
                document.getElementById('HiveKeychainBtn').style.display = 'block'
                document.getElementById('HiveKeychainBtn').onclick = () => {
                    hive_keychain.requestTransfer(receipient,shawpconfig.HiveReceiver,amt.toString(),receipient ? 'to: @' + receipient : '',paymentMethod,(e) => {
                        if (e) return alert(e.message)
                        document.getElementById('signuppay').style.display = 'none'
                        document.getElementById('signupcb').style.display = 'block'
                    })
                }
                document.getElementById('HiveSignerBtn').style.display = 'block'
                document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + (receipient ? '&memo=to: @' + receipient : '')
                break
            case 'STEEM':
            case 'SBD':
                document.getElementById('HiveKeychainBtn').style.display = 'none'
                document.getElementById('HiveSignerBtn').style.display = 'none'
                document.getElementById('SteemKeychainBtn').style.display = 'block'
                document.getElementById('SteemKeychainBtn').onclick = () => {
                    steem_keychain.requestTransfer(receipient,shawpconfig.SteemReceiver,amt.toString(),receipient ? 'to: @' + receipient : '',paymentMethod,(e) => {
                        if (e) return alert(e.message)
                        document.getElementById('signuppay').style.display = 'none'
                        document.getElementById('signupcb').style.display = 'block'
                    })
                }
                document.getElementById('SteemLoginBtn').style.display = 'block'
                document.getElementById('SteemLoginBtn').href = 'https://steemlogin.com/sign/transfer?to=' + shawpconfig.SteemReceiver + '&amount=' + amt + paymentMethod + (receipient ? '&memo=to: @' + receipient : '')
                break
            default:
                break
        }
        
        document.getElementById('signupstart').style.display = 'none'
        document.getElementById('signuppay').style.display = 'block'
    })
}

document.getElementById('redeemVoucherBtn').onclick = () => {
    alert('Invalid voucher code')
}
})

function keychainCb(hiveLoginRes,steemUser) {
    let encrypted_message = hiveLoginRes.result.substr(1)   
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
            window.location.href = cbUrl
        }
    }).catch((err) => {
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
    })
}

async function avalonLogin(avalonUsername,avalonKey) {
    if (avalonUsername !== '' && avalonKey !== '') {
        let avalonLoginPromise = new Promise((resolve,reject) => {
            javalon.getAccount(avalonUsername,(err,result) => {
                if (err) return reject(err)
                let avalonPubKey = javalon.privToPub(avalonKey)
                if (result.pub === avalonPubKey) return resolve(true)

                // Login with "Posting key" (recommended)
                for (let i = 0; i < result.keys.length; i++) {
                    if (arrContainsInt(result.keys[i].types,4) === true && result.keys[i].pub === avalonPubKey) return resolve(true)
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
    } else {
        // If Avalon username or password not provided, clear existing login (if any) from sessionStorage
        sessionStorage.clear()
    }
}

function exchageRate (coin,amount,cb) {
    switch (coin) {
        case 'DTC':
            // DTC payments coming soon
            break
        case 'HIVE':
            axios.get('https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * 0.0029 / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'HBD':
            axios.get('https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * 0.0029 / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'STEEM':
            axios.get('https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * 0.0029 / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'SBD':
            axios.get('https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * 0.0029 / response.data.market_data.current_price.usd * 1000) / 1000)
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