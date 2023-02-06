// HiveAuth
const APP_META = {
    name: 'oneloveipfs',
    description: 'IPFS hosting service'
}

const CHAIN_IDS = {
    hive: 'beeab0de00000000000000000000000000000000000000000000000000000000',
    steem: '0000000000000000000000000000000000000000000000000000000000000000',
    blurt: 'cd8d90f29ae273abec3eaa7731e25934c63eb654d55080caff2ebb7f5df6381f'
}

const HIVE_API = [
    'techcoderx.com',
    'api.hive.blog',
    'api.openhive.network',
    'api.deathwing.me',
    'api.hive.blue',
    'api.c0ff33a.uk',
    'api.pharesim.me',
    'anyx.io',
    'hived.emre.sh',
    'hive-api.arcange.eu',
    'rpc.ausbit.dev'
]

const AVALON_API = [
    'api.avalonblocks.com',
    'avalon.d.tube',
    'avalon.tibfox.com',
    'dtube.fso.ovh',
    'dtube.tekraze.com'
]

const BLURT_API = [
    'rpc.blurt.world',
    'blurt-rpc.saboin.com',
    'blurtrpc.actifit.io',
    'kentzz.blurt.world',
    'blurt-rpc.sagarkothari88.one'
]

const IPFS_GATEWAYS = [
    'ipfs.io',
    'gateway.pinata.cloud',
    'ipfs.fleek.co',
    'ipfs.litnet.work',
    'ipfs-3speak.b-cdn.net'
]

function getBlockchainAPI(network,httpsPrefix = true) {
    let persist = localStorage.getItem(network+'API')
    let result = ''
    switch (network) {
        case 'hive':
            result = (persist && HIVE_API.includes(persist)) ? persist : HIVE_API[0]
            break
        case 'avalon':
            result = (persist && AVALON_API.includes(persist)) ? persist : AVALON_API[0]
            break
        case 'blurt':
            result = (persist && BLURT_API.includes(persist)) ? persist : BLURT_API[0]
            break
        case 'steem':
            result = 'api.steemit.com'
            break
        default:
            return ''
    }
    if (httpsPrefix && !result.startsWith('https://') && !result.startsWith('http://'))
        result = 'https://'+result
    return result
}

function getPreferredIPFSGw(httpsPrefix = true) {
    if (!config.useUserPreferredGateway) {
        if (httpsPrefix && !config.gateway.startsWith('https://') && !config.gateway.startsWith('http://'))
            return 'https://'+config.gateway
        else if (!httpsPrefix)
            return config.gateway.replace('http://','').replace('https://','')
    }
    let result = localStorage.getItem('preferredIPFSGw') || config.gateway
    if (httpsPrefix && !result.startsWith('https://') && !result.startsWith('http://'))
        result = 'https://'+result
    return result
}

function loadAPISelections() {
    let hiveSelect = document.getElementById('hiveAPISelection')
    let avalonSelect = document.getElementById('avalonAPISelection')
    let blurtSelect = document.getElementById('blurtAPISelection')
    let ipfsGwSelect = document.getElementById('ipfsGwSelection')
    for (let i in HIVE_API)
        hiveSelect.appendChild(createOption(HIVE_API[i],HIVE_API[i]))
    for (let i in AVALON_API)
        avalonSelect.appendChild(createOption(AVALON_API[i],AVALON_API[i]))
    for (let i in BLURT_API)
        blurtSelect.appendChild(createOption(BLURT_API[i],BLURT_API[i]))
    let primaryIpfsGw = config.gateway.replace('http://','').replace('https://','')
    if (config.gateway)
        ipfsGwSelect.appendChild(createOption(primaryIpfsGw,primaryIpfsGw))
    if (config.useUserPreferredGateway) {
        for (let i in IPFS_GATEWAYS)
            if (IPFS_GATEWAYS[i] !== primaryIpfsGw)
                ipfsGwSelect.appendChild(createOption(IPFS_GATEWAYS[i],IPFS_GATEWAYS[i]))
    } else
        ipfsGwSelect.disabled = true
    hiveSelect.value = getBlockchainAPI('hive',false)
    avalonSelect.value = getBlockchainAPI('avalon',false)
    blurtSelect.value = getBlockchainAPI('blurt',false)
    ipfsGwSelect = getPreferredIPFSGw(false)
}

function saveAPISelections() {
    localStorage.setItem('hiveAPI',document.getElementById('hiveAPISelection').value)
    localStorage.setItem('avalonAPI',document.getElementById('avalonAPISelection').value)
    localStorage.setItem('blurtAPI',document.getElementById('blurtAPISelection').value)
    if (config.useUserPreferredGateway)
        localStorage.setItem('preferredIPFSGw',document.getElementById('ipfsGwSelection').value)
}

function getCookie(name) {
    return document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || ''
}

function arrContainsInt(arr,value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function listWords(arr = []) {
    if (arr.length === 0)
        return ''
    else if (arr.length === 1)
        return arr[0]
    return arr.slice(0,-1).join(', ')+' and '+arr[arr.length-1]
}

function toReadableNetwork(network) {
    switch (network) {
        case 'hive':
            return 'Hive'
        case 'dtc':
            return 'Avalon'
        case 'all':
            return 'All'
        default:
            return ''
    }
}

class TbodyRenderer {
    constructor() {
        this.rows = []
    }

    appendRow() {
        this.rows.push(Object.values(arguments))
    }

    renderRow() {
        let result = ''
        for (let i in this.rows) {
            result += '<tr>'
            for (let j in this.rows[i])
                result += '<td>'+this.rows[i][j]+'</td>'
            result += '</tr>'
        }
        return result
    }
}

function updateDisplayByIDs(toshow,tohide,type = 'block') {
    for (let i = 0; i < tohide.length; i++)
        document.getElementById(tohide[i]).style.display = 'none'
    
    for (let i = 0; i < toshow.length; i++)
        document.getElementById(toshow[i]).style.display = type
}

function setDisplayByClass(toSet, display = 'none') {
    let elems = document.getElementsByClassName(toSet)
    for (let i = 0; i < elems.length; i++)
        elems[i].style.display = display
}

function displayPopup(popupelement) {
    updateDisplayByIDs([popupelement],[])
    setTimeout(() => document.getElementById(popupelement+'Content').classList.add('popup-shown'),5)
}

function dismissPopup(event,popupelement) {
    let popup = document.getElementById(popupelement)
    let popupcontent = document.getElementById(popupelement+'Content')
    if (event.target == popup) {
        popupcontent.classList.remove('popup-shown')
        setTimeout(() => popup.style.display = 'none',300)
    }
}

function dismissPopupAction(popupelement) {
    document.getElementById(popupelement+'Content').classList.remove('popup-shown')
    setTimeout(() => updateDisplayByIDs([],[popupelement]),300)
}

// enable/disable elements
function toggleElems(toToggle = [], disable = false) {
    for (let i in toToggle) document.getElementById(toToggle[i]).disabled = disable
}

function togglePopupActions(popupActionGroupId, disable = false) {
    Array.from(document.getElementById(popupActionGroupId).children).forEach((val) => val.disabled = disable)
}

function HASError(e) {
    if (e.toString() === 'Error: expired')
        return 'HiveAuth authentication request expired'
    else if (e.cmd === 'auth_nack')
        return 'HiveAuth authentication request rejected'
    else if (e.cmd === 'sign_nack')
        return 'HiveAuth broadcast request rejected'
    else if (e.cmd === 'auth_err' || e.cmd === 'sign_err')
        return e.error
}

function axiosErrorHandler(e) {
    alert(axiosErrorMessage(e))
}

function axiosErrorMessage(e) {
    if (e.response && e.response.data && e.response.data.error)
        return e.response.data.error
    else
        return e.toString()
}

function thousandSeperator(num) {
    var num_parts = num.toString().split(".");
    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return num_parts.join(".");
}

function isEmpty(obj) {
    for(var key in obj)
        if(obj.hasOwnProperty(key))
            return false
    return true
}

function abbrevateFilesize(size) {
    let abbrevated
    if (size > 1125899906842623) {
        // Petabytes
        abbrevated = thousandSeperator(Math.round(size / 1125899906842624)) + ' PB'
    } else if (size > 1099511627775) {
        // Terabytes
        abbrevated = thousandSeperator(Math.round(size / 1099511627776)) + ' TB'
    } else if (size > 1073741823) {
        // Gigabytes
        abbrevated = thousandSeperator(Math.round(size / 1073741824)) + ' GB'
    } else if (size > 1048575) {
        // Megabytes
        abbrevated = thousandSeperator(Math.round(size / 1048576)) + ' MB'
    } else if (size > 1023) {
        // Kilobytes
        abbrevated = thousandSeperator(Math.round(size / 1024)) + ' KB'
    } else {
        // Bytes
        abbrevated = thousandSeperator(Math.round(size)) + ' B'
    }

    return abbrevated
}

function exchageRate (coin,amount,cb) {
    let coingeckoUrl
    let precision = 3
    switch (coin) {
        case 'DTUBE':
            coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/dtube-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
            precision = 2
            break
        case 'HIVE':
            coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
            break
        case 'HBD':
            coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
            break
        case 'BLURT':
            coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/blurt?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
            break
        default:
            break
    }
    axios.get(coingeckoUrl).then((response) => {
        cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * Math.pow(10,precision)) / Math.pow(10,precision))
    }).catch((e) => cb(e))
}

async function appbaseCall(network,method = '',params = []) {
    let acc = await axios.post(getBlockchainAPI(network),{
        id: 1,
        jsonrpc: '2.0',
        method: method,
        params: params
    })
    if (acc.data && acc.data.result)
        return acc.data.result
    else
        throw acc.data.error
}

function getGrapheneAccounts(network,usernames = []) {
    return appbaseCall(network, 'condenser_api.get_accounts', [usernames])
}

function getGrapheneContent(network,author,link) {
    return appbaseCall(network, 'condenser_api.get_content', [author, link])
}

async function getAvalonContent(author,link) {
    return (await axios.get(getBlockchainAPI('avalon')+'/content/'+author+'/'+link)).data
}

async function getAvalonAccount(username) {
    return (await axios.get(getBlockchainAPI('avalon')+'/account/'+username)).data
}

async function getAvalonKeyId(avalonUsername,avalonKey) {
    let result = await getAvalonAccount(avalonUsername)
    let avalonPubKey = hivecryptpro.PrivateKey.fromAvalonString(avalonKey).createPublic().toAvalonString()
    if (result.pub === avalonPubKey) return true

    // Custom key login (recommended)
    for (let i = 0; i < result.keys.length; i++)
        if (arrContainsInt(result.keys[i].types,4) === true && result.keys[i].pub === avalonPubKey)
            return result.keys[i].id
    return false
}

// Adopted from https://github.com/skzap/GrowInt/blob/master/index.js
class GrowInt {
    constructor(raw, config) {
        if (!config.min)
            config.min = Number.MIN_SAFE_INTEGER
        if (!config.max)
            config.max = Number.MAX_SAFE_INTEGER
        this.v = raw.v
        this.t = raw.t
        this.config = config
    }

    grow(time) {
        if (time < this.t) return
        if (this.config.growth === 0) return {
            v: this.v,
            t: time
        }

        let tmpValue = this.v
        tmpValue += (time-this.t)*this.config.growth
        
        let newValue = 0
        let newTime = 0
        if (this.config.growth > 0) {
            newValue = Math.floor(tmpValue)
            newTime = Math.ceil(this.t + ((newValue-this.v)/this.config.growth))
        } else {
            newValue = Math.ceil(tmpValue)
            newTime = Math.floor(this.t + ((newValue-this.v)/this.config.growth))
        }

        if (newValue > this.config.max)
            newValue = this.config.max

        if (newValue < this.config.min)
            newValue = this.config.min

        return {
            v: newValue,
            t: newTime
        }
    }
}

// From javalon
function getAvalonVP(account) {
    return new GrowInt(account.vt, {growth:account.balance/360000000, max: account.maxVt}).grow(new Date().getTime()).v
}

function getAvalonBw(account) {
    return new GrowInt(account.bw, {growth:Math.max(account.baseBwGrowth || 0,account.balance)/36000000, max:64000}).grow(new Date().getTime()).v
}

async function broadcastAvalonTx(tx) {
    await axios.post(getBlockchainAPI('avalon')+'/transact',tx,{
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
    })
}

// https://github.com/electron/electron/issues/2288
function isElectron() {
    // Renderer process
    if (typeof window.process === 'object' && window.process.type === 'renderer')
        return true

    // Main process
    if (window.process && typeof process.versions === 'object' && !!process.versions.electron)
        return true

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0)
        return true

    return false
}

// https://stackoverflow.com/questions/21741841/detecting-ios-android-operating-system
function getMobileOperatingSystem() {
    let userAgent = navigator.userAgent || navigator.vendor || window.opera

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent))
        return "Windows Phone"

    if (/android/i.test(userAgent))
        return "Android"

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
        return "iOS"

    return "unknown"
}


function validateHiveUsername(value) {
    let suffix = "Hive username must "
    if (!value)
        return suffix + "not be empty."
    let length = value.length
    if (length < 3 || length > 16)
        return suffix + "be between 3 and 16 characters."
    if (/\./.test(value))
        suffix = "Each account segment much "
    let ref = value.split(".")
    let label
    for (let i = 0, len = ref.length; i < len; i++) {
        label = ref[i]
        if (!/^[a-z]/.test(label))
            return suffix + "start with a letter."
        if (!/^[a-z0-9-]*$/.test(label))
            return suffix + "have only letters, digits, or dashes."
        if (/--/.test(label))
            return suffix + "have only one dash in a row."
        if (!/[a-z0-9]$/.test(label))
            return suffix + "end with a letter or digit."
        if (!(label.length >= 3))
            return suffix + "be longer"
    }
    return null
}

function validateAvalonUsername(u) {
    if (typeof u !== 'string') return 'username must be a string'
    if (u.length < 1 || u.length > 50) return 'username nust be between 1 and 50 characters long'
    let allowedUsernameChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let allowedUsernameCharsOnlyMiddle = '-.'
    u = u.toLowerCase()
    for (let i = 0; i < u.length; i++) {
        const c = u[i]
        // allowed username chars
        if (allowedUsernameChars.indexOf(c) === -1) 
            if (allowedUsernameCharsOnlyMiddle.indexOf(c) === -1)
                return 'invalid character ' + c
            else if (i === 0 || i === u.length-1)
                return 'character ' + c + ' can only be in the middle'
    }
    return null
}

function generateMessageToSign (username,network,cb) {
    // Generate text for user to sign
    // using latest block id
    let message = username+':'+config.authIdentifier+':'+network+':'
    switch (network) {
        case 'hive':
            appbaseCall(network,'condenser_api.get_dynamic_global_properties',[]).then(dgp => {
                message += dgp.head_block_number+':'+dgp.head_block_id
                cb(null,message)
            }).catch(e => cb(e.toString()))
            break
        case 'dtc':
        case 'avalon':
            axios.get(getBlockchainAPI('avalon')+'/count').then((r) => {
                if (r.data && r.data.count) {
                    message += r.data.count-1
                    message += ':'
                    axios.get(getBlockchainAPI('avalon')+'/block/'+(r.data.count-1)).then((b) => {
                        if (b.data && b.data.hash) {
                            message += b.data.hash
                            cb(null,message)
                        }
                    }).catch(e => cb(e.toString()))
                }
            }).catch(e => cb(e.toString()))
            break
    }
}

function generateMessageToSignPromise (username,network) {
    return new Promise((rs,rj) => generateMessageToSign(username,network,(e,r) => e ? rj(e) : rs(r)))
}

function disablePaymentMethods() {
    let paymentOptions = document.getElementById('pymtMtd').getElementsByTagName('option')
    for (let i = 0; i < paymentOptions.length; i++) {
        if ((paymentOptions[i].value == "HIVE" || paymentOptions[i].value == "HBD") && !shawpconfig.HiveReceiver)
            paymentOptions[i].disabled = true
        else if (paymentOptions[i].value === 'BLURT' && !shawpconfig.BlurtReceiver)
            paymentOptions[i].disabled = true
        else if (paymentOptions[i].value === 'DTUBE' && !shawpconfig.DtcReceiver)
            paymentOptions[i].disabled = true
    }
}

function hivePaymentClickListener(u,to,amt,currency,memo,p = 'signup') {
    updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn','hiveRecPayment'],['DTubeChannelBtn','dtcInstruction','BlurtKeychainBtn'])
    document.getElementById('HiveKeychainBtn').onclick = () => {
        if (document.getElementById('hiveRecPaymentCheckbox').checked) {
            let recurrence = parseInt(document.getElementById('hiveRecPaymentRecurrence').value)
            let frequency = parseInt(document.getElementById('hiveRecPaymentFrequency').value)
            let repeatPymtValidation = validateRepeatPaymentFields(recurrence,frequency)
            if (repeatPymtValidation)
                return alert(repeatPymtValidation)
            hive_keychain.requestRecurrentTransfer(u,to,amt,currency,memo,recurrence,frequency,(e) => {
                if (e.error) return alert(e.message)
                updateDisplayByIDs([p+'cb'],[p+'pay','HiveKeychainBtn','HiveSignerBtn','hiveRecPayment'])
            })
        } else
            hive_keychain.requestTransfer(u,to,amt.toString(),memo,currency,(e) => {
                if (e.error) return alert(e.message)
                updateDisplayByIDs([p+'cb'],[p+'pay','HiveKeychainBtn','HiveSignerBtn','hiveRecPayment'])
            })
    }
    document.getElementById('HiveSignerBtn').onclick = () => {
        let recurrence, frequency
        if (document.getElementById('hiveRecPaymentCheckbox').checked) {
            recurrence = parseInt(document.getElementById('hiveRecPaymentRecurrence').value)
            frequency = parseInt(document.getElementById('hiveRecPaymentFrequency').value)
            let repeatPymtValidation = validateRepeatPaymentFields(recurrence,frequency)
            if (repeatPymtValidation)
                return alert(repeatPymtValidation)
        }
        window.open(hivesignerPaymentUrl(to,amt,currency,memo,recurrence,frequency))
    }
}

function blurtPaymentClickListener(u,to,amt,currency,memo,p = 'signup') {
    updateDisplayByIDs(['BlurtKeychainBtn'],['DTubeChannelBtn','dtcInstruction','HiveKeychainBtn','HiveSignerBtn','hiveRecPayment'])
    document.getElementById('BlurtKeychainBtn').onclick = () => {
        blurt_keychain.requestTransfer(u,to,amt.toString(),memo,currency,(e) => {
            console.log(e)
            if (e.error) return alert(e.message)
            updateDisplayByIDs([p+'cb'],[p+'pay','BlurtKeychainBtn'])
        })
    }
}

function validateRepeatPaymentFields(recurrence, frequency) {
    if (isNaN(recurrence) || recurrence < 24)
        return 'Recurrence must be at least 24 hours'
    else if (isNaN(frequency) || frequency < 2)
        return 'Frequency must be at least 2'
    else
        return ''
}

function hivesignerPaymentUrl(to,amount,currency,memo,recurrence,frequency) {
    if (recurrence && frequency)
        return 'https://hivesigner.com/sign/recurrentTransfer?to='+to+'&amount='+amount+currency+'&memo='+memo+'&recurrence='+recurrence+'&executions='+frequency
    else
        return 'https://hivesigner.com/sign/transfer?to='+to+'&amount='+amount+currency+'&memo='+memo
}

function loadRemoteCSS(url) {
    let css = document.createElement('link')
    css.setAttribute('rel','stylesheet')
    css.setAttribute('type','text/css')
    css.setAttribute('href',url)
    document.getElementsByTagName('head')[0].appendChild(css)
}

function loadRemoteJavaScript(url) {
    let javascript = document.createElement('script')
    javascript.setAttribute('type','text/javascript')
    javascript.setAttribute('src',url)
    document.getElementsByTagName('head')[0].appendChild(javascript)
}

function createOption(value, text) {
    let opt = document.createElement('option')
    opt.innerText = text
    opt.value = value
    return opt
}

function copyToClipboard(value,tooltiptextcontainer) {
    let fakeInput = document.createElement("input")
    fakeInput.value = value
    document.body.appendChild(fakeInput)
    fakeInput.select()
    document.execCommand("copy")
    document.body.removeChild(fakeInput)
    if (tooltiptextcontainer)
        document.getElementById(tooltiptextcontainer).innerText = 'Copied to clipboard'
}

function openBrowserWindowElectron(url) {
    window.postMessage({ action: 'open_browser_window', data: url })
}

function updateAnchorsElectron() {
    if (isElectron()) {
        let anchors = document.getElementsByTagName('a')
        for (let i in anchors)
            if (typeof anchors[i].href === 'string' &&
                typeof anchors[i].target === 'string' &&
                anchors[i].href.startsWith('http') &&
                !anchors[i].href.startsWith(window.location.origin)) {
                let urlToOpen = anchors[i].href
                anchors[i].onclick = (evt) => {
                    evt.preventDefault()
                    openBrowserWindowElectron(urlToOpen)
                }
            }
    }
}

if (isElectron()) {
    window.open = openBrowserWindowElectron
    document.addEventListener('DOMContentLoaded',() => updateAnchorsElectron())
}