// Raw auth info
// let url = new URL(window.location.href)
// let token = url.searchParams.get('access_token') // Access token for logged in user
// let iskeychain = url.searchParams.get('keychain')

let geturl = '/wc_user_info?access_token=' + token

if (iskeychain !== 'true') geturl += '&scauth=true'

document.addEventListener('DOMContentLoaded', () => {
if (token == null || token == '') {
    document.getElementById('wcinfo').innerHTML = '<h3>Please login to view your account details.</h3>'
} else axios.get(geturl).then((result) => {
    if (isEmpty(result.data)) {
        return document.getElementById('wcinfo').innerHTML = '<h3>User is not a registered OneLoveIPFS customer!</h3>'
    } else if (result.data.balance) {
        let monthlyRate = result.data.rate * 30
        let infoToDisplay = '<h2>OneLoveIPFS account details</h2>'
        infoToDisplay += '<h3>Balance: ' + result.data.balance + ' GBdays'
        infoToDisplay += '<br><br>Rate: $' + result.data.rate + '/day (~$' + monthlyRate + '/month)'
        infoToDisplay += '<br><br>Joined Since: ' + moment(result.data.joinedSince).utc(result.data.joinedSince).local().format('MMMM DD YYYY h:mm:ss a') + '</h3>'
        document.getElementById('wcinfo').innerHTML = HtmlSanitizer.SanitizeHtml(infoToDisplay)
    } else {
        let totalAllocatedQuota = result.data.plan.quota + result.data.bonus + result.data.quotaOffset
        let botusage = result.data.botuse
        if (botusage == undefined) botusage = 0
        let infoToDisplay = '<h2>OneLoveIPFS account details</h2>'
        infoToDisplay += '<h3>User ID: ' + result.data.id
        infoToDisplay += '<br>Subscription tier: ' + result.data.plan.name
        infoToDisplay += '<br>Price: $' + result.data.plan.price + '/month'
        infoToDisplay += '<br>Referral count: ' + result.data.referred.length

        if (result.data.due) {
            let DateNow = new Date()
            let DueDate = new Date(result.data.due)
            infoToDisplay += '<br>Next payment: ' + moment(DueDate).utc(DueDate).local().format('MMMM DD YYYY h:mm:ss a')
            if (DateNow > DueDate)
                document.getElementById('pymtnotification').style.display = 'block'
        }
        infoToDisplay += '<br><br>Available balance: ' + humanReadableSize(result.data.avail) + ' (' + Math.ceil(result.data.avail / totalAllocatedQuota * 10000) / 100 + '% free)'
        infoToDisplay += '<br>Total quota: ' + humanReadableSize(totalAllocatedQuota) + '</h3>'
        infoToDisplay += '<h4>Purchased quota: ' + humanReadableSize(result.data.plan.quota)
        infoToDisplay += '<br>Referral bonus: ' + humanReadableSize(result.data.bonus)
        infoToDisplay += '<br>Other bonus: ' + humanReadableSize(result.data.quotaOffset)
        infoToDisplay += '<br><br>File upload disk usage: ' + humanReadableSize(totalAllocatedQuota - result.data.avail - botusage)
        infoToDisplay += '<br>Discord pinning bot disk usage: ' + humanReadableSize(botusage) + '</h4>'
        infoToDisplay += '<h5>If you think that the quota balance is incorrect, please contact techcoderx#7481 on Discord to request for a recomputation of your disk usage information.</h5>'
        document.getElementById('wcinfo').innerHTML = HtmlSanitizer.SanitizeHtml(infoToDisplay)
    }
}).catch((error) => {
    if (error.response.data.error)
    document.getElementById('wcinfo').innerHTML = '<h3>' + JSON.stringify(error.response.data.error) + '</h3>'
    else
        document.getElementById('wcinfo').innerHTML = '<h3>There is an error retrieving your OneLoveIPFS account details. Please login again. If error still persists, please contact techcoderx#7481 on Discord.</h3>'
})
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

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}