let geturl = '?access_token=' + token
if (iskeychain !== 'true') geturl += '&scauth=true'

axios.get('/shawp_config').then((result) => {
    window.shawpconfig = result.data
    if (!window.shawpconfig.Enabled) updateDisplayByIDs([],['refillCrModeBtn','subDetModeBtn'])
})

document.addEventListener('DOMContentLoaded', () => {
    if (token == null || token == '') {
        document.getElementById('wcinfo').innerHTML = '<h3>Please login to view your account details.</h3>'
    } else {
        axios.get('/shawp_user_info'+geturl).then((result) => {
            window.accdetail = result.data
            if (isEmpty(result.data)) {
                return document.getElementById('wcinfo').innerHTML = '<h3>User is not a registered OneLoveIPFS customer!</h3>'
            } else {
                let monthlyRate = result.data.rate * 30
                let infoToDisplay = '<h2>Account summary</h2>'
                if (result.data.aliasUser && result.data.aliasNetwork)
                    infoToDisplay += '<h4>This is an alias account of ' + result.data.aliasUser + ' on ' + (result.data.aliasNetwork == 'all' ? 'Hive and Avalon networks.' : (toReadableNetwork(result.data.aliasNetwork) + ' network.')) + '</h4>'
                infoToDisplay += '<h4>Balance: ' + result.data.balance + ' GBdays</h4>'
                infoToDisplay += '<h4>Current Usage: ' + abbrevateFilesize(result.data.usage) + '</h4>'

                if (result.data.daysremaining && result.data.daysremaining > 0)
                    infoToDisplay += '<h4>Days remaining (based on balance and usage): ' + result.data.daysremaining + '</h4>'

                infoToDisplay += '<h4>Rate: $' + result.data.rate + '/day (~$' + monthlyRate + '/month)</h4>'
                infoToDisplay += '<h4>Joined Since: ' + moment(result.data.joinedSince).utc(result.data.joinedSince).local().format('MMMM DD YYYY h:mm:ss a') + '</h4>'

                if (result.data.usagedetails && result.data.usage > 0) {
                    infoToDisplay += '<br><h2>Usage breakdown</h2>'
                    if (result.data.usagedetails.videos) infoToDisplay += '<h4>Source videos: ' + abbrevateFilesize(result.data.usagedetails.videos) + '</h4>'
                    if (result.data.usagedetails.video240) infoToDisplay += '<h4>240p videos: ' + abbrevateFilesize(result.data.usagedetails.video240) + '</h4>'
                    if (result.data.usagedetails.video480) infoToDisplay += '<h4>480p videos: ' + abbrevateFilesize(result.data.usagedetails.video480) + '</h4>'
                    if (result.data.usagedetails.video720) infoToDisplay += '<h4>720p videos: ' + abbrevateFilesize(result.data.usagedetails.video720) + '</h4>'
                    if (result.data.usagedetails.video1080) infoToDisplay += '<h4>1080p videos: ' + abbrevateFilesize(result.data.usagedetails.video1080) + '</h4>'
                    if (result.data.usagedetails.thumbnails) infoToDisplay += '<h4>Thumbnails: ' + abbrevateFilesize(result.data.usagedetails.thumbnails) + '</h4>'
                    if (result.data.usagedetails.sprites) infoToDisplay += '<h4>Sprites: ' + abbrevateFilesize(result.data.usagedetails.sprites) + '</h4>'
                    if (result.data.usagedetails.subtitles) infoToDisplay += '<h4>Subtitles: ' + abbrevateFilesize(result.data.usagedetails.subtitles) + '</h4>'
                    if (result.data.usagedetails.streams) infoToDisplay += '<h4>Streams: ' + abbrevateFilesize(result.data.usagedetails.streams) + '</h4>'
                }

                if (!result.data.aliasUser && !result.data.aliasNetwork) {
                    infoToDisplay += '<br><hr><h2>Aliased Users</h2>'
                    infoToDisplay += '<h4>You may add another account on the same or different network as an alias so that you can upload using those accounts while having your upload usage billed to this account. You may need to enter the private key of the alias account if not using Keychain extensions. The private key entered will only be used for verification purposes and will not leave your browser, nor stored anywhere.</h4><br>'
                    infoToDisplay += '<table id="newAlias">'
                    infoToDisplay += '<td><select id="newAliasNet" style="height:34px; line-height:34px;" onchange="aliasNetworkSelect()"><option value="hive">Hive</option><option value="dtc">Avalon</option></select></td>'
                    infoToDisplay += '<td><input type="text" placeholder="New alias username" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" id="newAliasUser" class="meta"></td>'
                    infoToDisplay += '<td><input type="password" placeholder="Key" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" id="newAliasKey" class="meta"></td>'
                    infoToDisplay += '<td><a class="styledButton" id="newAliasAdd" onclick="addAliasBtn()">+</a></td>'
                    infoToDisplay +='</table><br><table style="width: 100%;" id="aliasList"><thead><tr><td>Username</td><td>Network</td><td>Remove</td></tr></thead><tbody id="aliasedUsrsTBdy"></tbody></table>'
                }

                document.getElementById('wcinfo').innerHTML = infoToDisplay
                refreshAliasAccs()
                aliasNetworkSelect()

                if (accdetail.daysremaining > 0 && accdetail.daysremaining < 7)
                    updateDisplayByIDs(['refillnotify'],[])
                else if (accdetail.daysremaining == 0) {
                    document.getElementById('needsrefillnotify').innerText = 'Uploads have been disabled for your account due to insufficient balance, needs ' + Math.ceil(accdetail.needs) + ' GBdays. Please refill your hosting credits to upload.'
                    updateDisplayByIDs(['needsrefillnotify'],[])
                }
            }
        }).catch((error) => {
            if (error.response.data && error.response.data.error)
                document.getElementById('wcinfo').innerHTML = '<h3>' + JSON.stringify(error.response.data.error) + '</h3>'
            else
                document.getElementById('wcinfo').innerHTML = '<h3>There is an error retrieving your OneLoveIPFS account details. Please login again. If error still persists, please contact techcoderx#7481 on Discord.</h3>'
        })

        axios.get('/shawp_refill_history'+geturl).then(rfh => {
            window.rfh = rfh.data
            populateRefillHistory(window.rfh,0)
        }).catch(() => {})
    }

    if (url.searchParams.get('callback') == 'refillcb')
        updateDisplayByIDs(['refiller','refillPopup','refillcb'],['uploadForm','refillpay'])
    else if (url.searchParams.get('callback') == 'refillcancel')
        updateDisplayByIDs(['refiller','refillPopup','refillcancel'],['uploadForm','refillpay'])

    document.getElementById('refillSubmitBtn').onclick = () => {
        updateDisplayByIDs(['refillpay'],['refillcb','refillcancel'])

        if (document.getElementById('gbdaysInput').value == '') return alert('Please specify GBdays to refill.')

        let paymentMethod = document.getElementById('pymtMtd').value
        let creditsToBuy = parseFloat(document.getElementById('gbdaysInput').value)
        if (creditsToBuy <= 0) return alert('Purchase quantity must not be less than or equals to zero.')
        document.getElementById('refillSubmitBtn').value = 'Loading...'
        document.getElementById('refillSubmitBtn').disabled = true
        let nativePymtProcessors = ['DTC','HIVE','HBD']
        if (nativePymtProcessors.includes(paymentMethod)) exchageRate(paymentMethod,creditsToBuy,(e,amt) => {
            document.getElementById('refillSubmitBtn').value = 'Refill'
            document.getElementById('refillSubmitBtn').disabled = false
            if (e) return alert(e)
            amt = paymentMethod === 'DTC' ? amt.toFixed(2) : amt.toFixed(3)
            document.getElementById('gbdaysconfirm').innerText = 'Credits: ' + creditsToBuy + ' GBdays'
            document.getElementById('quoteAmt').innerText = 'Amount: ' + amt + ' ' + paymentMethod
            updateDisplayByIDs(['nativeDisclaimer'],[])

            let memo = currentnetwork === 'all' ? ('to: @' + username) : ('to: ' + currentnetwork + '@' + username)
            document.getElementById('xferMemo').innerHTML = 'Memo: <u>' + memo + '</u>'

            switch (paymentMethod) {
                case 'DTC':
                    updateDisplayByIDs(['DTubeChannelBtn','dtcInstruction'],['HiveKeychainBtn','HiveSignerBtn','SteemKeychainBtn','SteemLoginBtn'])
                    document.getElementById('DTubeChannelBtn').onclick = () => window.open('https://d.tube/#!/c/' + shawpconfig.DtcReceiver)
                    document.getElementById('DTubeChannelBtn').href = 'https://d.tube/#!/c/' + shawpconfig.DtcReceiver
                    break
                case 'HIVE':
                case 'HBD':
                    updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn'],['DTubeChannelBtn','dtcInstruction'])
                    document.getElementById('HiveKeychainBtn').onclick = () => {
                        hive_keychain.requestTransfer(username,shawpconfig.HiveReceiver,amt.toString(),memo,paymentMethod,(e) => {
                            if (e.error) return alert(e.error)
                            updateDisplayByIDs(['refillcb'],['refillpay'])
                        })
                    }
                    document.getElementById('HiveSignerBtn').href = 'https://hivesigner.com/sign/transfer?to=' + shawpconfig.HiveReceiver + '&amount=' + amt + paymentMethod + '&memo=' + memo
                    break
                default:
                    break
            }
            updateDisplayByIDs(['refillPopup'],[])
        })
    }
})

function dismissPopup(event,popupelement) {
    let popup = document.getElementById(popupelement)
    if (event.target == popup) {
        popup.style.display = "none"
    }
}

function populateRefillHistory(rfh,view) {
    let refillHistoryHtml = ''
    for (let i = 0; i < rfh.length; i++)
        refillHistoryHtml += '<tr><td>' + (view == 0 ? rfh[i].usdAmt : rfh[i].rawAmt) + '</td><td>' + rfh[i].credits + '</td><td>' + new Date(rfh[i].ts).toLocaleString() + '</td></tr>'
    document.getElementById('refillHistoryHAmt').innerText = view == 0 ? 'Amount (USD)' : 'Amount (Crypto)'
    document.getElementById('refillHistoryTbody').innerHTML = refillHistoryHtml
}

function handleAmtViewChange(selected) {
    populateRefillHistory(window.rfh,selected.selectedIndex)
}

function aliasNetworkSelect() {
    if (window.accdetail.aliasUser && window.accdetail.aliasNetwork) return
    let selected = document.getElementById('newAliasNet').value
    switch (selected) {
        case 'hive':
            if (!isElectron() || window.hive_keychain)
                updateDisplayByIDs([],['newAliasKey'])
            else {
                document.getElementById('newAliasKey').placeholder = 'Hive Key'
                updateDisplayByIDs(['newAliasKey'],[])
            }
            break
        case 'dtc':
            document.getElementById('newAliasKey').placeholder = 'Avalon Key'
            updateDisplayByIDs(['newAliasKey'],[])
            break
    }
}

function addAliasBtn() {
    addAlias(document.getElementById('newAliasUser').value,document.getElementById('newAliasKey').value,document.getElementById('newAliasNet').value)
}

function getAUTHtml(data) {
    let result = ''
    for (let i in data) {
        result += '<tr><td>' + data[i].username + '</td><td>' + toReadableNetwork(data[i].network) + '</td><td><a onclick="removeAlias(\'' + data[i].username + '\',\'' + data[i].network + '\')">Remove</a></tr>'
    }
    return result
}

function addAlias(user,key,network) {
    let loginMtd
    if (network == 'dtc')
        loginMtd = avalonAliasAuth
    else if (network == 'hive')
        loginMtd = hiveAliasAuth
    loginMtd(user,key,(token) => {
        axios.put('/update_alias'+geturl,{ operation: 'set', aliasKey: token })
            .then(() => refreshAliasAccs())
            .catch(axiosErrorHandler)
    })
}

function removeAlias(username,network) {
    axios.put('/update_alias'+geturl,{ operation: 'unset', targetUser: username, targetNetwork: network })
        .then(() => refreshAliasAccs())
        .catch(axiosErrorHandler)
}

function refreshAliasAccs() {
    if (window.accdetail.aliasUser && window.accdetail.aliasNetwork) return
    axios.get('/get_alias'+geturl)
        .then((r) => {
            document.getElementById('aliasedUsrsTBdy').innerHTML = getAUTHtml(r.data)
            document.getElementById('newAliasUser').value = ''
            document.getElementById('newAliasKey').value = ''
        })
        .catch(() => alert('Deletion success but something went wrong while updating alias list'))
}

async function avalonAliasAuth(avalonUsername,avalonKey,cb) {
    let avalonKeyId
    try {
        avalonKeyId = await getAvalonKeyId(avalonUsername,avalonKey)
        if (avalonKeyId === false)
            return alert('Avalon key is invalid')
    } catch (e) {
        return alert('Avalon login error: ' + e)
    }
    
    let loginGetUrl = '/login?noauth=1&user=' + avalonUsername + '&dtc=true'
    if (avalonKeyId && avalonKeyId !== true) loginGetUrl += '&dtckeyid=' + avalonKeyId
    axios.get(loginGetUrl).then((response) => {
        if (response.data.error != null)
            return alert(response.data.error)
        javalon.decrypt(avalonKey,response.data.encrypted_memo,(e,decryptedAES) => {
            if (e)
                return alert('Avalon decrypt error: ' + e.error)
            cb(decryptedAES)
        })
    }).catch(axiosErrorHandler)
}

async function hiveAliasAuth(hiveUsername,hiveKey,cb) {
    let loginUrl = '/login?noauth=1&network=hive&user='+hiveUsername
    axios.get(loginUrl).then((r) => {
        if (isElectron()) {
            let token
            try {
                token = hivecrypt.decode(hiveKey,r.data.encrypted_memo).substr(1)
            } catch {
                return handleLoginError('Unable to decode access token with Hive posting key')
            }
            cb(token)
        } else hive_keychain.requestVerifyKey(hiveUsername,r.data.encrypted_memo,'Posting',(kr) => {
            if (kr.data.error != null)
                return alert(response.data.error)
            cb(kr.result.substr(1))
        })
    }).catch(axiosErrorHandler)
}