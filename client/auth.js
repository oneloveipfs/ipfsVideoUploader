// Load Steem Connect access token to client
let url = new URL(window.location.href)
let token = url.searchParams.get('access_token') // Access token for logged in user
let iskeychain = url.searchParams.get('keychain')
let steemUser = url.searchParams.get('steemuser')
let dtconly = url.searchParams.get('dtconly')
let displayUsernameTimeout = -1
let dtcDisplayUser, hiveDisplayUser = null

async function Hive() {
    if (!token) {
        // Not logged in or no access token
        displayLoginMessage()
        return null
    } else if (iskeychain == 'true') {
        // Hive Keychain / Avalon only Login
        let keychainLoginPromise = new Promise((resolve,reject) => {
            axios.get('/auth?access_token=' + token).then((authResponse) => {
                if (authResponse.data.error != null) {
                    alert(authResponse.data.error)
                    displayLoginMessage(true)
                    resolve(null)
                } else {
                    window.currentnetwork = authResponse.data.network
                    if (dtconly == 'true') {
                        let grapheneSettings = document.getElementsByClassName('grapheneSettings')
                        for (let i = 0; i < grapheneSettings.length; i++)
                            grapheneSettings[i].style.display = 'none'
                        dtcDisplayUser = authResponse.data.user
                        displayLoginMessage()
                    } else {
                        hiveDisplayUser = authResponse.data.user
                        displayLoginMessage()
                    }
                    retrieveDraft()
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
                        alert('Looks like you do not have access to the uploader!')
                        return resolve(res.account.name)
                    }

                    // Retrieve metadata from draft if any
                    retrieveDraft()
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
    // Verify Avalon login
    let avalonUser = sessionStorage.getItem('dtcUser')
    let avalonKey = sessionStorage.getItem('dtcKey')
    let promoteDisabled = false

    if (!avalonUser || !avalonKey) return

    let avalonLoginPromise = new Promise((resolve,reject) => {
        document.getElementById('connectedAvalonNode').style.display = 'block'
        javalon.init({api: 'https://avalon.oneloved.tube'})
        javalon.getAccount(avalonUser,(err,result) => {
            document.getElementById('connectedAvalonNode').innerText = 'Connected to ' + javalon.config.api
            if (err) return reject(err)
            let avalonPubKey = javalon.privToPub(avalonKey)
            if (result.pub === avalonPubKey) return resolve(true)
            
            // Login with "Posting key" (recommended)
            for (let i = 0; i < result.keys.length; i++) {
                if (result.keys[i].types.includes(4) && result.keys[i].pub === avalonPubKey) {
                    if (!result.keys[i].types.includes(13)) promoteDisabled = true
                    return resolve(true)
                }
            }
            resolve(false)
        })
    })
    
    try {
        let avalonLoginResult = await avalonLoginPromise
        if (avalonLoginResult != true) {
            restrict()
            return alert('Avalon key is invalid! Please login again.')
        }
    } catch (e) {
        restrict()
        return alert('An error occured with Avalon authentication: ' + e.toString())
    }
    dtcDisplayUser = avalonUser
    displayLoginMessage()
    if (promoteDisabled) document.getElementById('dtcBurnSection').style.display = 'none'
    document.getElementById('avalonZone').style.display = 'block'
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
        let shouldInsertComma = false
        let message = 'You are logged in as '
        if (hiveDisplayUser) {
            message += hiveDisplayUser + ' on Hive'
            shouldInsertComma = true
        }
        if (steemUser) {
            if (shouldInsertComma) message += ', '
            if (!dtcDisplayUser) message += ' and '
            message += steemUser + ' on Steem'
            shouldInsertComma = true
        }
        if (dtcDisplayUser) {
            if (shouldInsertComma) message += ' and '
            message += dtcDisplayUser + ' on Avalon'
        }
        document.getElementById('loggedInUser').innerHTML = HtmlSanitizer.SanitizeHtml(message)
    }
}

function restrict() {
    const toDisable = ['sourcevideo','snapfile','title','description','tags','powerup','postBody','postImgBtn','draftBtn','submitbutton','newLanguageField','chooseSubBtn','uploadSubBtn','thumbnailSwapLink','linkSubmitBtn','newSnap','swapSubmitBtn']
    for (let i = 0; i < toDisable.length; i++) document.getElementById(toDisable[i]).disabled = true
}

function retrieveDraft() {
    let savedTitle = localStorage.getItem('OneLoveTitle')
    let savedDescription = localStorage.getItem('OneLoveDescription')
    let savedTags = localStorage.getItem('OneLoveTags')
    let savedPostBody = localStorage.getItem('OneLovePostBody')

    if (savedTitle != null) {
        document.getElementById('title').value = savedTitle
    }

    if (savedDescription != null) {
        document.getElementById('description').value = savedDescription
    }

    if (savedTags != null) {
        document.getElementById('tags').value = savedTags
    }

    if (savedPostBody != null) {
        document.getElementById('postBody').value = savedPostBody
    }
}

window.Auth = {
    Hive,
    Avalon,
    token,
    iskeychain,
    dtconly,
    restrict
}