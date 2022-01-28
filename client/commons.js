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

function updateDisplayByIDs(toshow,tohide) {
    for (let i = 0; i < tohide.length; i++)
        document.getElementById(tohide[i]).style.display = 'none'
    
    for (let i = 0; i < toshow.length; i++)
        document.getElementById(toshow[i]).style.display = 'block'
}

function axiosErrorHandler(e) {
    if (e.response && e.response.data && e.response.data.error)
        alert(e.response.data.error)
    else
        alert(e.toString())
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

function validateAvalonUsername(username) {
    if (typeof username !== 'string') return 'username must be a string'
    if (username.length < 1 || username.length > 50) return 'username nust be between 1 and 50 characters long'
    let allowedUsernameChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let allowedUsernameCharsOnlyMiddle = '-.'
    username = username.toLowerCase()
    for (let i = 0; i < username.length; i++) {
        const c = username[i]
        // allowed username chars
        if (allowedUsernameChars.indexOf(c) === -1) 
            if (allowedUsernameCharsOnlyMiddle.indexOf(c) === -1)
                return 'invalid character ' + c
            else if (i === 0 || i === username.length-1)
                return 'character ' + c + ' can only be in the middle'
    }
    return null
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