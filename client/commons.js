// HiveAuth
const APP_META = {
    name: 'oneloveipfs',
    description: 'IPFS hosting service'
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
    'rpc.blurt.live',
    'rpc.blurtlatam.com',
    'blurt-rpc.saboin.com',
    'blurtrpc.actifit.io',
    'kentzz.blurt.world'
]

function getBlockchainAPI(network,httpsPrefix = true) {
    let persist = localStorage.getItem(network+'API')
    let result = ''
    switch (network) {
        case 'hive':
            if (persist && HIVE_API.includes(persist))
                result = persist
            else
                result = HIVE_API[0]
            break
        case 'avalon':
            if (persist && AVALON_API.includes(persist))
                result = persist
            else
                result = AVALON_API[0]
            break
        case 'blurt':
            if (persist && BLURT_API.includes(persist))
                result = persist
            else
                result = BLURT_API[0]
            break
        default:
            return ''
    }
    if (httpsPrefix && !result.startsWith('https://') && !result.startsWith('http://'))
        result = 'https://'+result
    return result
}

function loadAPISelections() {
    let hiveSelect = document.getElementById('hiveAPISelection')
    let avalonSelect = document.getElementById('avalonAPISelection')
    let blurtSelect = document.getElementById('blurtAPISelection')
    for (let i in HIVE_API)
        hiveSelect.appendChild(createOption(HIVE_API[i],HIVE_API[i]))
    for (let i in AVALON_API)
        avalonSelect.appendChild(createOption(AVALON_API[i],AVALON_API[i]))
    for (let i in BLURT_API)
        blurtSelect.appendChild(createOption(BLURT_API[i],BLURT_API[i]))
    hiveSelect.value = getBlockchainAPI('hive',false)
    avalonSelect.value = getBlockchainAPI('avalon',false)
    blurtSelect.value = getBlockchainAPI('blurt',false)
}

function saveAPISelections() {
    localStorage.setItem('hiveAPI',document.getElementById('hiveAPISelection').value)
    localStorage.setItem('avalonAPI',document.getElementById('avalonAPISelection').value)
    localStorage.setItem('blurtAPI',document.getElementById('blurtAPISelection').value)
}

function arrContainsInt(arr,value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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

function updateDisplayByIDs(toshow,tohide,type = 'block') {
    for (let i = 0; i < tohide.length; i++)
        document.getElementById(tohide[i]).style.display = 'none'
    
    for (let i = 0; i < toshow.length; i++)
        document.getElementById(toshow[i]).style.display = type
}

// enable/disable elements
function toggleElems(toToggle = [], disable = false) {
    for (let i in toToggle) document.getElementById(toToggle[i]).disabled = disable
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
        default:
            break
    }
    axios.get(coingeckoUrl).then((response) => {
        cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * Math.pow(10,precision)) / Math.pow(10,precision))
    }).catch((e) => cb(e))
}

function getAvalonKeyId(avalonUsername,avalonKey) {
    return new Promise((resolve,reject) => javalon.getAccount(avalonUsername,(err,result) => {
        if (err) return reject(err)
        let avalonPubKey = javalon.privToPub(avalonKey)
        if (result.pub === avalonPubKey) return resolve(true)

        // Custom key login (recommended)
        for (let i = 0; i < result.keys.length; i++)
            if (arrContainsInt(result.keys[i].types,4) === true && result.keys[i].pub === avalonPubKey)
                return resolve(result.keys[i].id)
        resolve(false)
    }))
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
            axios.post(getBlockchainAPI('hive'),{
                id: 1,
                jsonrpc: '2.0',
                method: 'condenser_api.get_dynamic_global_properties',
                params: []
            }).then((r) => {
                if (r.data && r.data.result) {
                    message += r.data.result.head_block_number+':'+r.data.result.head_block_id
                    cb(null,message)
                } else if (r.data && r.data.error)
                    cb(r.data.error.message)
            }).catch(e => cb(e.toString()))
            break
        case 'dtc':
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

function hivePaymentClickListener(u,to,amt,currency,memo,p = 'signup') {
    updateDisplayByIDs(['HiveKeychainBtn','HiveSignerBtn','hiveRecPayment'],['DTubeChannelBtn','dtcInstruction'])
    document.getElementById('HiveKeychainBtn').onclick = () => {
        if (document.getElementById('hiveRecPaymentCheckbox').checked) {
            let recurrence = parseInt(document.getElementById('hiveRecPaymentRecurrence').value)
            let frequency = parseInt(document.getElementById('hiveRecPaymentFrequency').value)
            let repeatPymtValidation = validateRepeatPaymentFields(recurrence,frequency)
            if (repeatPymtValidation)
                return alert(repeatPymtValidation)
            hive_keychain.requestRecurrentTransfer(u,to,amt,currency,memo,recurrence,frequency,(e) => {
                if (e.error) return alert(e.message)
                updateDisplayByIDs([p+'cb'],[p+'pay'])
            })
        } else
            hive_keychain.requestTransfer(u,to,amt.toString(),memo,currency,(e) => {
                if (e.error) return alert(e.message)
                updateDisplayByIDs([p+'cb'],[p+'pay'])
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

if (isElectron()) {
    window.open = openBrowserWindowElectron
    document.addEventListener('DOMContentLoaded',() => {
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
    })
}