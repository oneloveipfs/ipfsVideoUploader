// Load Steem Connect access token to client
let url = new URL(window.location.href)
let token = url.searchParams.get('access_token') // Access token for logged in user
let iskeychain = url.searchParams.get('keychain')
let steemUser = url.searchParams.get('steemuser')
let blurtUser = url.searchParams.get('blurtuser')
let avalonKc = url.searchParams.get('avalonkc')
let avalonKcUser = url.searchParams.get('avalonkcuser')
let displayUsernameTimeout = -1
let dtcDisplayUser, hiveDisplayUser = null
let hiveAuthLogin = null

if (avalonKc !== 'Active' && avalonKc !== 'Posting' && avalonKc !== 'Memo')
    avalonKc = ''

async function Hive() {
    if (!token) {
        // Not logged in or no access token
        displayLoginMessage()
        return null
    } else if (iskeychain == 'true') {
        // Non-HiveSigner login
        let keychainLoginPromise = new Promise((resolve,reject) => {
            axios.get('/auth?access_token=' + token).then((authResponse) => {
                if (authResponse.data.error != null) {
                    alert(authResponse.data.error)
                    displayLoginMessage(true)
                    resolve(null)
                } else {
                    window.currentnetwork = authResponse.data.network // network used for access token
                    hiveDisplayUser = sessionStorage.getItem('hiveUser')
                    if (!hiveDisplayUser && !steemUser && !blurtUser) {
                        setDisplayByClass('grapheneSettings')
                    } else {
                        // HiveAuth login
                        try {
                            hiveAuthLogin = JSON.parse(localStorage.getItem('hiveAuth'))
                            if (hiveAuthLogin)
                                window.hiveauth.authenticate(hiveAuthLogin,APP_META,{})
                        } catch {}
                    }
                    displayLoginMessage()
                    resolve(authResponse.data.user)
                }
            }).catch((error) => {
                console.log(error)
                if (error.response.data.error)
                    alert(error.response.data.error)
                else
                    alert(error)
                displayLoginMessage(true)
                resolve(null)
            })
        })
        let user = await keychainLoginPromise
        return user
    } else {
        // HiveSigner login
        let hivesignerLoginPromise = new Promise((resolve,reject) => {
            let hiveapi = new hivesigner.Client({ accessToken: token })
            hiveapi.me((err,res) => {
                if (err) {
                    alert(JSON.stringify(err))
                    return resolve(null)
                }
                hiveDisplayUser = res.account.name
                window.currentnetwork = 'hive'
                displayLoginMessage()
                
                axios.get('/checkuser?user=' + res.account.name).then(function(response) {
                    console.log(response)
                    if (response.data.isInWhitelist == false) {
                        restrict()
                        alert('Uploader access denied!')
                        return resolve(res.account.name)
                    }
                    resolve(res.account.name)
                }).catch((error) => {
                    alert('Authentication error: ' + error)
                    return resolve(null)
                })
            })
        })

        let hiveuser = await hivesignerLoginPromise
        return hiveuser
    }
}

async function Avalon() {
    // Verify Avalon login, returns avalon account object
    let avalonUser = sessionStorage.getItem('avalonUser')
    let avalonKey = sessionStorage.getItem('avalonKey')
    let promoteDisabled = false
    let avalonAcc

    if ((!avalonUser || !avalonKey) && (!avalonKc || !avalonKcUser))
        return
    else if (avalonUser && (!avalonKc || !avalonKcUser)) {     
        let avalonLoginResult = false
        try {
            avalonAcc = await getAvalonAccount(avalonUser)
            let avalonPubKey = hivecryptpro.PrivateKey.fromAvalonString(avalonKey).createPublic().toAvalonString()
            if (avalonAcc.pub === avalonPubKey) avalonLoginResult = true
            for (let i = 0; i < avalonAcc.keys.length; i++) {
                if (avalonAcc.keys[i].types.includes(4) && avalonAcc.keys[i].pub === avalonPubKey) {
                    if (!avalonAcc.keys[i].types.includes(13)) promoteDisabled = true
                    avalonLoginResult = true
                    break
                }
            }
            if (avalonLoginResult != true) {
                restrict()
                return alert('Avalon key is invalid! Please login again.')
            }
        } catch (e) {
            restrict()
            return alert('Avalon auth error: ' + e.toString())
        }
    } else if (avalonUser && avalonKc && avalonKcUser) {
        try {
            avalonAcc = await getAvalonAccount(avalonUser)
        } catch (e) {
            restrict()
            return alert('Failed to retrieve Avalon account: '+e.toString())
        }
    }
    dtcDisplayUser = avalonUser
    displayLoginMessage()
    if (promoteDisabled) document.getElementById('dtcBurnSection').style.display = 'none'
    document.getElementById('avalonZone').style.display = 'block'
    return avalonAcc
}

function displayLoginMessage(errored) {
    if (document.readyState === 'loading') {
        clearTimeout(displayUsernameTimeout)
        displayUsernameTimeout = setTimeout(() => displayLoginMessage(),100)
    } else if (!token) {
        document.getElementById('loggedInUser').innerHTML = 'You are not logged in!'
        restrict()
    } else if (errored) {
        document.getElementById('loggedInUser').innerHTML = 'Login errored'
        restrict()
    } else {
        let message = 'You are logged in as '
        let displayAccs = []
        if (hiveDisplayUser)
            displayAccs.push(hiveDisplayUser + ' on Hive' + (hiveAuthLogin ? ' (HiveAuth)' : ''))
        if (steemUser)
            displayAccs.push(steemUser + ' on Steem')
        if (blurtUser)
            displayAccs.push(blurtUser + ' on Blurt')
        if (dtcDisplayUser)
            displayAccs.push(dtcDisplayUser + ' on Avalon')
        message += listWords(displayAccs)
        document.getElementById('loggedInUser').innerHTML = HtmlSanitizer.SanitizeHtml(message)
    }
}

function restrict() {
    const toDisable = ['sourcevideo','snapfile','title','description','tags','powerup','postBody','postImgBtn','draftBtn','submitbutton','newLanguageField','chooseSubBtn','uploadSubBtn','linkSubmitBtn','swapSubmitBtn']
    for (let i = 0; i < toDisable.length; i++) document.getElementById(toDisable[i]).disabled = true
}

function usernameByNetwork(network) {
    switch (network) {
        case 'hive':
            return hiveDisplayUser
        case 'avalon':
            return dtcDisplayUser
        case 'steem':
            return steemUser
        case 'blurt':
            return blurtUser
    }
}

window.Auth = {
    Hive,
    Avalon,
    token,
    iskeychain,
    restrict
}