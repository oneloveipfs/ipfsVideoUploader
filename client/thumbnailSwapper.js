// TODO: Modularize authentication
let username2
let url2 = new URL(window.location.href)
let token2 = url2.searchParams.get('access_token') // Access token for logged in user
let iskeychain2 = url2.searchParams.get('keychain')
if (iskeychain2 == 'true') {
    // Steem Keychain Login
    axios.get('/auth?access_token=' + token2).then((authResponse) => {
        if (!authResponse.data.error) username2 = authResponse.data.user
    })
} else {
    // SteemConnect login
    let api2 = sc2.Initialize({ accessToken: token2 })
    api2.me((err,res) => {
        if (!err) username2 = res.account.name // Account name
    })
}

let selectedAuthor
let selectedPermlink

function modeBtnClicked() {
    let uploader = document.getElementById('uploadForm')
    let thumbnailSwapper = document.getElementById('thumbnailSwapper')
    let modeSwitchBtn = document.getElementById('modeBtn')

    if (uploader.style.display == 'none') {
        uploader.style.display = 'block'
        thumbnailSwapper.style.display = 'none'
        modeSwitchBtn.innerHTML = 'New Upload'

    } else {
        uploader.style.display = 'none'
        thumbnailSwapper.style.display = 'block'
        modeSwitchBtn.innerHTML = 'Thumbnail Swap'
    }
}

function submitLink() {
    let linkInput = document.getElementById('thumbnailSwapLink')
    if (!linkInput.value.startsWith('https://d.tube/#!/v/') && !linkInput.value.startsWith('https://d.tube/v/'))
        return alert('Link provided is not a valid d.tube video link.')
    let split = linkInput.value.replace('/#!').replace('https://d.tube/v/','').split('/')
    if (split.length != 2)
        return alert('Link provided is an invalid d.tube video link format.')
    if (split[0] !== username)
        return alert('DTube video selected is not your video!')
    steem.api.getContent(split[0],split[1],(err,result) => {
        if (err) return document.getElementById('linkResult').innerHTML = '<h4>Steem error: ' + err + '</h4>'
        console.log(result)
        let jsonmeta = JSON.parse(result.json_metadata)
        if (!jsonmeta.video)
            return alert('Link provided is actually not a DTube video!')
        if (!jsonmeta.video.info)
            return alert('Failed to retrieve DTube video info.')

        selectedAuthor = split[0]
        selectedPermlink = split[1]

        let snapLink = result.body.match(/\bhttps?:\/\/\S+/gi)[1].replace('\'></a></center><hr>','')
        
        document.getElementById('currentSnap').innerHTML = '<img class="snapImgPreview" src="https://snap1.d.tube/ipfs/' + jsonmeta.video.info.snaphash + '">'
        let resultHTMLToAppend2 = '<h4>Title: ' + result.title + '<br><br>'
        resultHTMLToAppend2 += 'Permlink: ' + split[1] + '<br><br>'
        resultHTMLToAppend2 += 'Current thumbnail hash: ' + jsonmeta.video.info.snaphash + '</h4>'
        document.getElementById('videoInfo').innerHTML = resultHTMLToAppend2
        document.getElementById('newSnapField').style.display = 'block'
        document.getElementById('swapSubmitBtn').style.display = 'block'
    })
}

function changeThumbnail() {
    console.log('it worked')
}