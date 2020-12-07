const fs = require('fs')
const userconfigdir = (process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs') + '/config.json'
let defaultConfig = require('./config.json')
let userConfig = {}

if (fs.existsSync(userconfigdir)) {
    let readConfig = fs.readFileSync(userconfigdir,'utf8')
    try {
        userConfig = JSON.parse(readConfig)
        defaultConfig = Object.assign(defaultConfig,userConfig)
    } catch (error) {
        console.log('failed to parse user defined config.json, using default config instead')
    }
}

module.exports = defaultConfig