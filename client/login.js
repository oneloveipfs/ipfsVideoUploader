let config

document.addEventListener('DOMContentLoaded', () => {
    let proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
    document.getElementById('authButton').onclick = function loginBtnClicked() {
    // Show popup window of login options
    document.getElementById('loginPopup').style.display = "block"

    axios.get('/config').then((result) => {
        config = result.data

        if (!config.steemconnectEnabled) {
            let tohide = document.getElementsByClassName("sclogin")
            for (let i = 0; i < tohide.length; i++) {
                tohide[i].style.display = "none"
            }
        }
    })
}

window.onclick = (event) => {
    dismissPopup(event,'loginPopup')
}

window.ontouchstart = (event) => {
    dismissPopup(event,'loginPopup')
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
    let hiveClient = new hivesigner.Client({
        app: 'ipfsuploader.app',
        callbackURL: 'https://beta.oneloved.tube/upload',
        scope: ['comment','comment_options']
    })

    hiveClient.login({},(err,token) => {
        console.log('HiveSigner',err,token)
    })
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

function arrContainsInt(arr,value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true
    }
}