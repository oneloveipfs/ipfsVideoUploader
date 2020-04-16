let geturl = '/wc_user_info?access_token=' + token

if (iskeychain !== 'true') geturl += '&scauth=true'

axios.get('/shawp_config').then((result) => window.shawpconfig = result.data)

document.addEventListener('DOMContentLoaded', () => {
if (token == null || token == '') {
    document.getElementById('wcinfo').innerHTML = '<h3>Please login to view your account details.</h3>'
} else axios.get(geturl).then((result) => {
    window.accdetail = result.data
    if (isEmpty(result.data)) {
        return document.getElementById('wcinfo').innerHTML = '<h3>User is not a registered OneLoveIPFS customer!</h3>'
    } else if (result.data.balance) {
        let monthlyRate = result.data.rate * 30
        let infoToDisplay = '<h2>Account summary</h2>'
        infoToDisplay += '<h3>Balance: ' + result.data.balance + ' GBdays'
        infoToDisplay += '<br>Current Usage: ' + humanReadableSize(result.data.usage)
        infoToDisplay += '<br>Rate: $' + result.data.rate + '/day (~$' + monthlyRate + '/month)'
        infoToDisplay += '<br>Joined Since: ' + moment(result.data.joinedSince).utc(result.data.joinedSince).local().format('MMMM DD YYYY h:mm:ss a') + '</h3>'

        if (result.data.usagedetails && result.data.usage > 0) {
            infoToDisplay += '<br><h2>Usage breakdown</h2><h3>'
            if (result.data.usagedetails.videos) infoToDisplay += 'Source videos: ' + humanReadableSize(result.data.usagedetails.videos) + '<br>'
            if (result.data.usagedetails.video240) infoToDisplay += '240p videos: ' + humanReadableSize(result.data.usagedetails.video240) + '<br>'
            if (result.data.usagedetails.video480) infoToDisplay += '480p videos: ' + humanReadableSize(result.data.usagedetails.video480) + '<br>'
            if (result.data.usagedetails.video720) infoToDisplay += '720p videos: ' + humanReadableSize(result.data.usagedetails.video720) + '<br>'
            if (result.data.usagedetails.video1080) infoToDisplay += '1080p videos: ' + humanReadableSize(result.data.usagedetails.video1080) + '<br>'
            if (result.data.usagedetails.thumbnails) infoToDisplay += 'Thumbnails: ' + humanReadableSize(result.data.usagedetails.thumbnails) + '<br>'
            if (result.data.usagedetails.sprites) infoToDisplay += 'Sprites: ' + humanReadableSize(result.data.usagedetails.sprites) + '<br>'
            if (result.data.usagedetails.subtitles) infoToDisplay += 'Subtitles: ' + humanReadableSize(result.data.usagedetails.subtitles) + '<br>'
            infoToDisplay += '</h3>'
        }

        document.getElementById('wcinfo').innerHTML = HtmlSanitizer.SanitizeHtml(infoToDisplay)

        if (accdetail.daysRemaining > 0 && accdetail.daysRemaining < 7)
            document.getElementById('refillnotify').style.display = 'block'
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
                document.getElementById('refillnotify').style.display = 'block'
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

document.getElementById('refillSubmitBtn').onclick = () => {
    document.getElementById('refillpay').style.display = 'block'
    document.getElementById('refillcb').style.display = 'none'

    let paymentMethod = document.getElementById('pymtMtd').value
    let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
    if (creditsToBuy <= 0) return alert('Purchase quantity must not be less than or equals to zero.')
    document.getElementById('refillSubmitBtn').value = 'Loading...'
    document.getElementById('refillSubmitBtn').disabled = true
    exchageRate(paymentMethod,creditsToBuy,(e,amt) => {
        document.getElementById('refillSubmitBtn').value = 'Refill'
        document.getElementById('refillSubmitBtn').disabled = false
        if (e) return alert(e)
        amt = amt.toFixed(3)
        document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
        document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod

        switch (paymentMethod) {
            case 'HIVE':
            case 'HBD':
                document.getElementById('SteemKeychainBtn').style.display = 'none'
                document.getElementById('SteemLoginBtn').style.display = 'none'
                document.getElementById('HiveKeychainBtn').style.display = 'block'
                document.getElementById('HiveKeychainBtn').onclick = () => {
                    hive_keychain.requestTransfer(username,shawpconfig.HiveReceiver,amt.toString(),'to: @' + username,paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        document.getElementById('refillpay').style.display = 'none'
                        document.getElementById('refillcb').style.display = 'block'
                    })
                }
                document.getElementById('HiveSignerBtn').style.display = 'block'
                document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + '&memo=to: @' + username
                break
            case 'STEEM':
            case 'SBD':
                document.getElementById('HiveKeychainBtn').style.display = 'none'
                document.getElementById('HiveSignerBtn').style.display = 'none'
                document.getElementById('SteemKeychainBtn').style.display = 'block'
                document.getElementById('SteemKeychainBtn').onclick = () => {
                    steem_keychain.requestTransfer(steemUser,shawpconfig.SteemReceiver,amt.toString(),'to: @' + username,paymentMethod,(e) => {
                        if (e.error) return alert(e.error)
                        document.getElementById('refillpay').style.display = 'none'
                        document.getElementById('refillcb').style.display = 'block'
                    })
                }
                document.getElementById('SteemLoginBtn').style.display = 'block'
                document.getElementById('SteemLoginBtn').href = 'https://steemlogin.com/sign/transfer?to=' + shawpconfig.SteemReceiver + '&amount=' + amt + paymentMethod + '&memo=to: @' + username
                break
            default:
                break
        }
        document.getElementById('refillPopup').style.display = 'block'
    })
}
})

window.onclick = (event) => {
    dismissPopup(event,'refillPopup')
}

window.ontouchstart = (event) => {
    dismissPopup(event,'refillPopup')
}

function dismissPopup(event,popupelement) {
    let popup = document.getElementById(popupelement)
    if (event.target == popup) {
        popup.style.display = "none"
    }
}

function exchageRate (coin,amount,cb) {
    switch (coin) {
        case 'DTC':
            // DTC payments coming soon
            break
        case 'HIVE':
            axios.get('https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * accdetail.rate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'HBD':
            axios.get('https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * accdetail.rate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'STEEM':
            axios.get('https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * accdetail.rate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'SBD':
            axios.get('https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * accdetail.rate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        default:
            break
    }
}

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