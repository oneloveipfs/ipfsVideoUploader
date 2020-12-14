const fs = require('fs')
const userconfigdir = (process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs') + '/config.json'
let defaultConfig = require('../config.json')
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

// Sprite generation script is not supported on Windows
if (process.platform == 'win32')
    defaultConfig.spritesEnabled = false

module.exports = defaultConfig