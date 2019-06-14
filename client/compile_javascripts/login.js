const jAvalon = require('javalon')

document.addEventListener('DOMContentLoaded', () => {
    let keychainAuthBtnDisabled = document.getElementById('keychainAuthBtn').disabled
    document.getElementById('authButton').onclick = function loginBtnClicked() {
    // Show popup window of login options
    document.getElementById('loginPopup').style.display = "block"
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

document.getElementById('keychainAuthBtn').onclick = async function keychainLogin() {
    if (keychainAuthBtnDisabled == true) {
        return
    }
    let keychainLoginBtn = document.getElementById('keychainAuthBtn')
    let username = document.getElementById('loginUsername').value.toLowerCase().replace('@','')
    let avalonUsername = document.getElementById('avalonLoginUsername').value.toLowerCase().replace('@','')
    let avalonKey = document.getElementById('avalonLoginKey').value

    if (!window.steem_keychain) {
        alert('Steem Keychain is not installed!')
        return
    }

    steem_keychain.requestHandshake(() => console.log('Handshake received!'))
    keychainLoginBtn.innerText = "Logging In..."
    keychainAuthBtnDisabled = true

    // Avalon login
    if (avalonUsername !== '' && avalonKey !== '') {
        let avalonLoginPromise = new Promise((resolve,reject) => {
            jAvalon.getAccount(avalonUsername,(err,result) => {
                if (err) return reject(err)
                let avalonPubKey = jAvalon.privToPub(avalonKey)
                if (result.pub === avalonPubKey) return resolve(true)
                resolve(false)
            })
        })
        
        try {
            let avalonLoginResult = await avalonLoginPromise
            if (avalonLoginResult != true) {
                cancelLoginBtn()
                return alert('Avalon key is invalid!')
            }
        } catch (e) {
            cancelLoginBtn()
            return alert('Avalon login error: ' + e)
        }
        
        // Storing Avalon login in sessionStorage so that we can access this in the upload page to sign transactions later.
        sessionStorage.setItem('OneLoveAvalonUser',avalonUsername)
        sessionStorage.setItem('OneLoveAvalonKey',avalonKey)
    } else {
        // If Avalon username or password not provided, clear existing login (if any) from sessionStorage
        sessionStorage.clear()
    }

    // Steem Keychain login
    axios.get('/login?user=' + username).then((response) => {
        if (response.data.error != null) {
            alert(response.data.error)
            cancelLoginBtn()
            return
        }
        steem_keychain.requestVerifyKey(username,response.data.encrypted_memo,'Posting',(loginResponse) => {
            console.log(loginResponse)
            if (loginResponse.error != null) {
                alert(loginResponse.message)
                cancelLoginBtn()
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
                    cancelLoginBtn()
                } else {
                    window.location.href = '/upload?access_token=' + cbResponse.data.access_token + '&keychain=true'
                }
            }).catch((err) => {
                if (err.response.data.error) alert(err.response.data.error)
                else alert(err)
                cancelLoginBtn()
            })
        })
    }).catch((err) => {
        if (err.response.data.error) alert(err.response.data.error)
        else alert(err)
        cancelLoginBtn()
    })
}

function cancelLoginBtn() {
    let keychainLoginBtn = document.getElementById('keychainAuthBtn')
    keychainLoginBtn.innerText = "Login with Steem Keychain"
    keychainAuthBtnDisabled = false
}
})