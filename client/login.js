let scconfig

document.addEventListener('DOMContentLoaded', () => {
    let proceedAuthBtnDisabled = document.getElementById('proceedAuthBtn').disabled
    document.getElementById('authButton').onclick = function loginBtnClicked() {
    // Show popup window of login options
    document.getElementById('loginPopup').style.display = "block"

    axios.get('/config').then((result) => {
        scconfig = result.data

        if (!scconfig.steemconnectEnabled) {
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
    if (proceedAuthBtnDisabled == true) {
        return
    }
    let sclogin = false
    let keychainLoginBtn = document.getElementById('proceedAuthBtn')
    let username = document.getElementById('loginUsername').value.toLowerCase().replace('@','')
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    if (!window.steem_keychain && document.getElementById('proceedAuthBtn').innerText === 'Login with Steem Keychain') {
        alert('Steem Keychain is not installed!')
        return
    }

    if (window.steem_keychain) steem_keychain.requestHandshake(() => console.log('Handshake received!'))
    if (document.getElementById('proceedAuthBtn').innerText === 'Proceed to SteemConnect') sclogin = true
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
                cancelLoginBtn(sclogin)
                return alert('Avalon key is invalid!')
            }
        } catch (e) {
            cancelLoginBtn(sclogin)
            return alert('Avalon login error: ' + e)
        }
        
        // Storing Avalon login in sessionStorage so that we can access this in the upload page to sign transactions later.
        sessionStorage.setItem('OneLoveAvalonUser',avalonUsername)
        sessionStorage.setItem('OneLoveAvalonKey',avalonKey)
    } else {
        // If Avalon username or password not provided, clear existing login (if any) from sessionStorage
        sessionStorage.clear()
    }

    // Proceed to SteemConnect login page if SteemConnect login chosen
    if (sclogin === true) {
        return window.location.href = scconfig.steemconnectLoginURL
    }

    // Steem Keychain login
    axios.get('/login?user=' + username).then((response) => {
        if (response.data.error != null) {
            alert(response.data.error)
            cancelLoginBtn(sclogin)
            return
        }
        steem_keychain.requestVerifyKey(username,response.data.encrypted_memo,'Posting',(loginResponse) => {
            console.log(loginResponse)
            if (loginResponse.error != null) {
                alert(loginResponse.message)
                cancelLoginBtn(sclogin)
                return
            }
            let encrypted_message = loginResponse.result.substr(1)   
            let contentType = {
                headers: {
                    "content-type": "text/plain",
                },
            }

            axios.post('/logincb',encrypted_message,contentType).then((cbResponse) => {
                if (cbResponse.data.error != null) {
                    alert(cbResponse.data.error)
                    cancelLoginBtn(sclogin)
                } else {
                    window.location.href = '/upload?access_token=' + cbResponse.data.access_token + '&keychain=true'
                }
            }).catch((err) => {
                if (err.response.data.error) alert(err.response.data.error)
                else alert(err)
                cancelLoginBtn(sclogin)
            })
        })
    }).catch((err) => {
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
        cancelLoginBtn(sclogin)
    })
}

document.getElementById('altAuthBtn').onclick = () => {
    if (document.getElementById('altAuthBtn').innerText === 'Login with SteemConnect') {
        document.getElementById('loginUsername').style.display = 'none'
        document.getElementById('sameAvalonUsername').style.display = 'none'
        document.getElementById('proceedAuthBtn').innerText = 'Proceed to SteemConnect'
        document.getElementById('altAuthBtn').innerText = 'Login with Steem Keychain'
    } else {
        document.getElementById('loginUsername').style.display = 'inline'
        document.getElementById('sameAvalonUsername').style.display = 'block'
        document.getElementById('proceedAuthBtn').innerText = 'Login with Steem Keychain'
        document.getElementById('altAuthBtn').innerText = 'Login with SteemConnect'
    }
}

function cancelLoginBtn(sc) {
    let keychainLoginBtn = document.getElementById('proceedAuthBtn')
    if (sc === true)
        keychainLoginBtn.innerText = "Proceed to SteemConnect"
    else
        keychainLoginBtn.innerText = "Login with Steem Keychain"
    proceedAuthBtnDisabled = false
}
})

function arrContainsInt(arr,value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true
    }
}