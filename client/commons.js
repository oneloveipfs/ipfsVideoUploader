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
    } else {
        // Less than 1 MB
        abbrevated = thousandSeperator(Math.round(size / 1024)) + ' KB'
    }

    return abbrevated
}

function exchageRate (coin,amount,cb) {
    switch (coin) {
        case 'DTC':
            // DTC payments coming soon
            break
        case 'HIVE':
            axios.get('https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'HBD':
            axios.get('https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'STEEM':
            axios.get('https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        case 'SBD':
            axios.get('https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                cb(null,Math.ceil(amount * shawpconfig.DefaultUSDRate / response.data.market_data.current_price.usd * 1000) / 1000)
            }).catch((e) => cb(e))
            break
        default:
            break
    }
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