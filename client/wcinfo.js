// Raw auth info
let url = new URL(window.location.href)
let token = url.searchParams.get('access_token') // Access token for logged in user
let iskeychain = url.searchParams.get('keychain')

let geturl = '/wc_user_info?access_token=' + token

if (iskeychain !== 'true') geturl += '&scauth=true'

axios.get(geturl).then((result) => {
    if (result.data == {}) {
        return document.getElementById('wcinfo').innerHTML = '<h3>User is not a registered OneLoveIPFS customer!</h3>'
    } else {
        let infoToDisplay = '<h2>OneLoveIPFS account details</h2>'
        infoToDisplay += '<h3>User ID: ' + result.data.id
        infoToDisplay += '<br>Subscription tier: ' + result.data.package.name
        infoToDisplay += '<br>Price: $' + result.data.package.price + '/month'
        infoToDisplay += '<br>Referral count: ' + result.data.referred.length
        infoToDisplay += '<br><br>Purchased quota: ' + humanReadableSize(result.data.package.quota)
        infoToDisplay += '<br>Referral bonus: ' + humanReadableSize(result.data.bonus)
        infoToDisplay += '<br>Other bonus: ' + humanReadableSize(result.data.quotaOffset)
        infoToDisplay += '<br>Available balance: ' + humanReadableSize(result.data.avail)
        infoToDisplay += '</h3>'
        infoToDisplay += '<h5>If you think that the quota balance is incorrect, please contact techcoderx#7481 on Discord to request for a recomputation of your disk usage information.</h5>'
        document.getElementById('wcinfo').innerHTML = HtmlSanitizer.SanitizeHtml(infoToDisplay)
    }
}).catch((error) => {
    if (error.response.data.error)
        alert(error.response.data.error)
    else
        alert(error)
})

function humanReadableSize(size) {
    let readable
    if (size > 1000000000)
        readable = Math.floor(size / 10737418.24) / 100 + ' GB'
    else if (size > 1000000)
        readable = Math.floor(size / 10485.76) / 100 + ' MB'
    else if (size == undefined || size == 0)
        readable = '0 KB'
    else
        readable = Math.floor(size / 10.24) / 100 + ' KB'

    return readable
}