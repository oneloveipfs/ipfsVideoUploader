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
                        let grapheneSettings = document.getElementsByClassName('grapheneSettings')
                        for (let i = 0; i < grapheneSettings.length; i++)
                            grapheneSettings[i].style.display = 'none'
                    } else {
                        // HiveAuth login
                        try {
                            hiveAuthLogin = JSON.parse(localStorage.getItem('hiveAuth'))
                            if (hiveAuthLogin)
                                window.hiveauth.authenticate(hiveAuthLogin,APP_META,{})
                        } catch {}
                    }
                    displayLoginMessage()
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
                        alert('Uploader access denied!')
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
    let avalonUser = sessionStorage.getItem('avalonUser')
    let avalonKey = sessionStorage.getItem('avalonKey')
    let promoteDisabled = false

    if ((!avalonUser || !avalonKey) && (!avalonKc || !avalonKcUser))
        return
    else if (avalonUser && (!avalonKc || !avalonKcUser)) {
        let avalonLoginPromise = new Promise((resolve,reject) => {
            javalon.init({api: 'https://api.avalonblocks.com'})
            javalon.getAccount(avalonUser,(err,result) => {
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
            return alert('Avalon auth error: ' + e.toString())
        }
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
        if (displayAccs.length === 1)
            message += displayAccs[0]
        else
            message += displayAccs.slice(0,-1).join(', ') + ' and ' + displayAccs[displayAccs.length-1]
        document.getElementById('loggedInUser').innerHTML = HtmlSanitizer.SanitizeHtml(message)
    }
}

function restrict() {
    const toDisable = ['sourcevideo','snapfile','title','description','tags','powerup','postBody','postImgBtn','draftBtn','submitbutton','newLanguageField','chooseSubBtn','uploadSubBtn','metaEditLink','linkSubmitBtn','newSnap','swapSubmitBtn']
    for (let i = 0; i < toDisable.length; i++) document.getElementById(toDisable[i]).disabled = true
}

function retrieveDraft() {
    let savedTitle = localStorage.getItem('OneLoveTitle')
    let savedDescription = localStorage.getItem('OneLoveDescription')
    let savedTags = localStorage.getItem('OneLoveTags')
    let savedPostBody = localStorage.getItem('OneLovePostBody')
    let savedGraphenePermlink = localStorage.getItem('DraftGraphenePermlink')
    let savedSteemBenefs = localStorage.getItem('DraftSteemBeneficiaries')
    let savedHiveBenefs = localStorage.getItem('DraftHiveBeneficiaries')
    let savedPowerUp = localStorage.getItem('DraftPowerUp')
    let savedSkynetUpload = localStorage.getItem('DraftSkynetUpload')

    if (savedTitle)
        document.getElementById('title').value = savedTitle
    if (savedDescription)
        document.getElementById('description').value = savedDescription
    if (savedTags)
        document.getElementById('tags').value = savedTags
    if (savedPostBody)
        document.getElementById('postBody').value = savedPostBody
    if (savedGraphenePermlink)
        document.getElementById('customPermlink').value = savedGraphenePermlink
    if (savedSteemBenefs) {
        try {
            let savedSteemBenefsArr = JSON.parse(savedSteemBenefs)
            for (let b in savedSteemBenefsArr)
                steemBeneficiaries.addAccount(savedSteemBenefsArr[b].account,savedSteemBenefsArr[b].weight)
        } catch {}
    }
    if (savedHiveBenefs) {
        try {
            let savedHiveBenefsArr = JSON.parse(savedHiveBenefs)
            for (let b in savedHiveBenefsArr)
                hiveBeneficiaries.addAccount(savedHiveBenefsArr[b].account,savedHiveBenefsArr[b].weight)
        } catch {}
    }
    if (savedPowerUp && savedPowerUp === 'true')
        document.getElementById('powerup').checked = true
    if (savedSkynetUpload && savedSkynetUpload === 'true')
        document.getElementById('skynetupload').checked = true
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