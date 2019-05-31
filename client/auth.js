// Load Steem Connect access token to client
export let username
let url = new URL(window.location.href)
export let token = url.searchParams.get('access_token') // Access token for logged in user
export let iskeychain = url.searchParams.get('keychain')
if (!token) {
    // Not logged in or no access token
    window.setTimeout(function() {
        document.getElementById('loggedInUser').innerHTML = 'You are not logged in!'
        restrict()
    },100)
} else if (iskeychain == 'true') {
    // Steem Keychain Login
    axios.get('/auth?access_token=' + token).then((authResponse) => {
        if (authResponse.data.error != null) {
            alert(authResponse.data.error)
            document.getElementById('loggedInUser').innerHTML = 'Not authorized'
            restrict()
        } else {
            username = authResponse.data.user
            document.getElementById('loggedInUser').innerHTML = 'You are logged in as ' + authResponse.data.user
            retrieveDraft()
        }
    }).catch((error) => {
        if (error.response.data.error)
            alert(error.response.data.error)
        else
            alert(error)
        document.getElementById('loggedInUser').innerHTML = 'Login failed'
        restrict()
    })
} else {
    // SteemConnect login
    let api = sc2.Initialize({ accessToken: token })
    api.me((err,res) => {
        username = res.account.name // Account name
        document.getElementById('loggedInUser').innerHTML = 'You are logged in as ' + res.account.name
        axios.get('/checkuser?user=' + res.account.name).then(function(response) {
            console.log(response)
            if (response.data.isInWhitelist == false) {
                restrict()
                return alert('Looks like you do not have access to the uploader!')
            }

            // Retrieve metadata from draft if any
            retrieveDraft()
        })
    })
}

export function restrict() {
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