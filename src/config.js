const REMOTE_APP = 0
const fs = require('fs')
const deepmerge = require('deepmerge')
const userconfigdir = (process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs') + '/config.json'
let defaultConfig = require('../config.json')
if (REMOTE_APP === 1)
    defaultConfig = require('../remoteAppConfig.json')
let userConfig = {}

if (fs.existsSync(userconfigdir)) {
    let readConfig = fs.readFileSync(userconfigdir,'utf8')
    try {
        userConfig = JSON.parse(readConfig)
        defaultConfig = deepmerge(defaultConfig,userConfig)
    } catch (error) {
        console.log('failed to parse user defined config.json, using default config instead')
    }
}

// Sprite generation script and video duration is not supported on Windows
// Also disabled on Electron apps for security reasons :\
if (process.platform == 'win32' && REMOTE_APP === 0 || require('electron').app) {
    defaultConfig.spritesEnabled = false
    defaultConfig.durationAPIEnabled = false
}

module.exports = defaultConfig