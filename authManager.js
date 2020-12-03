const Hive = require('@hiveio/hive-js')
const Hivecrypt = require('hivecrypt')
const Avalon = require('javalon')
const HiveSigner = require('hivesigner')
const JWT = require('jsonwebtoken')
const Crypto = require('crypto-js')
const fs = require('fs')
const { EOL } = require('os')
const Keys = require('./.auth.json')
const Config = require('./config.json')
const Shawp = require('./shawp')

Hive.api.setOptions({ url: Config.Shawp.HiveAPI || 'https://hived.techcoderx.com', useAppbaseApi: true })
Hive.config.set('uri', Config.Shawp.HiveAPI || 'https://hived.techcoderx.com')
Hive.config.set('alternative_api_endpoints', [])

// If whitelist file doesn't exist create it
if (Config.whitelistEnabled && !fs.existsSync('whitelist.txt'))
    fs.writeFileSync('./whitelist.txt','')

// Cache whitelist in a variable, and update variable when fs detects a file change
let whitelist = fs.readFileSync('whitelist.txt','utf8').split(EOL)

// Watch for external whitelist.txt changes
let whitelistWatcher = fs.watch('whitelist.txt',() => {
    fs.readFile('whitelist.txt', 'utf8',(err,readList) => {
        if (err) return console.log('Error while updating whitelist: ' + err)
        whitelist = readList.split(EOL)
        auth.whitelistTrim()
    })
})

let auth = {
    generateEncryptedMemo: (username,cb,hc) => {
        // Generate encrypted text to be decrypted by Keychain or posting key on client
        let message = username + ':oneloveipfs_login:hive'
        if (auth.isInWhitelist(username,null))
            message = username + ':oneloveipfs_login:all'
        else if (auth.isInWhitelist(username,'dtc'))
            message = username + ':oneloveipfs_login:dtc'
        let encrypted_message = Crypto.AES.encrypt(message,Keys.AESKey).toString()
        Hive.api.getAccounts([username],(err,res) => {
            if (err) return cb(err)
            let pack = hc == '1' ? Hivecrypt : Hive.memo
            let encrypted_memo
            try {
                encrypted_memo = pack.encode(Keys.wifMessage,res[0].posting.key_auths[0][0],'#' + encrypted_message)
            } catch {
                return cb('Failed to generate memo to decode')
            }
            cb(null,encrypted_memo)
        })
    },
    generateEncryptedMemoAvalon: async (username,keyid,cb) => {
        if (keyid && keyid.length > 25) return cb({error: 'Invalid custom key identifier'})
        let message = username + ':oneloveipfs_login:dtc'
        if (auth.isInWhitelist(username,null)) message = username + ':oneloveipfs_login:all'
        let encrypted_message = Crypto.AES.encrypt(message,Keys.AESKey).toString()
        let avalonGetAccPromise = new Promise((resolve,reject) => {
            Avalon.getAccount(username,(e,acc) => {
                if (e) return reject(e)
                resolve(acc)
            })
        })
        try {
            let avalonAcc = await avalonGetAccPromise
            let pubKey
            if (keyid || keyid === '') {
                // Custom key
                for (let i = 0; i < avalonAcc.keys.length; i++) 
                    if (avalonAcc.keys[i].id == keyid && avalonAcc.keys[i].types.includes(4))
                        pubKey = avalonAcc.keys[i].pub
                if (!pubKey)
                    return cb({error: 'Custom key identifier not found'})
            } else
                pubKey = avalonAcc.pub // Master key
            
            Avalon.encrypt(pubKey,encrypted_message,Keys.avalonKeypair.priv,(err,encrypted) => {
                if (err) return cb(err)
                cb(null,encrypted)
            })
        } catch (e) {
            cb(e)
        }
    },
    generateJWT: (user,network,cb) => {
        // Generate access token to be sent as response
        let timeNow = Date.now()
        JWT.sign({
            user: user,
            app: Config.tokenApp,
            network: network,
            iat: timeNow / 1000,
            exp: (timeNow / 1000) + Config.tokenExpiry
        },Keys.JWTKey,(err,token) => {
            if (err) return cb('Error generating access token: ' + err)
            cb(null,token)
        })
    },
    verifyAuth: (access_token,needscredits,cb) => {
        if (!access_token) return cb('Missing access token')
        JWT.verify(access_token,Keys.JWTKey,(err,result) => {
            if (err != null)
                cb('Login error: ' + err)
            else if (Config.whitelistEnabled === true) {
                if (!auth.isInWhitelist(result.user,result.network))
                    return cb('Looks like you do not have access to the uploader!')
                if (Config.Shawp.Enabled && needscredits) {
                    let daysRemaining = Shawp.getDaysRemaining(result.user,result.network)
                    if (daysRemaining.days === 0 && daysRemaining.needs)
                        cb('Insufficient hosting credits, needs additional ' + Math.ceil(daysRemaining.needs) + ' GBdays.')
                    else
                        cb(null,result)
                } else cb(null,result)
            }
        })
    },
    scAuth: (access_token,needscredits,cb) => {
        if (!access_token) return cb('Missing access token')
        let scapi = new HiveSigner.Client({ accessToken: access_token })
        scapi.me((err,result) => {
            if (err) return cb(err)
            if (!auth.isInWhitelist(result.user,'hive'))
                return cb('Looks like you do not have access to the uploader!')
            if (Config.Shawp.Enabled && needscredits) {
                let network = 'hive'
                if (auth.isInWhitelist(result.user,null))
                    network = 'all'
                let daysRemaining = Shawp.getDaysRemaining(result.user,network)
                if (daysRemaining.days === 0 && daysRemaining.needs)
                    cb('Insufficient hosting credits, needs additional ' + Math.ceil(daysRemaining.needs) + ' GBdays.')
                }
                
                if (auth.isInWhitelist(result.account.name,null))
                    cb(null,result.account.name,'all')
                else
                    cb(null,result.account.name,'hive')
        })
    },
    authenticate: (access_token,keychain,needscredits,cb) => {
        if (Config.whitelistEnabled && !access_token) return cb('Missing API auth credentials')
        if (keychain === 'true') {
            auth.verifyAuth(access_token,needscredits,(err,result) => {
                if (err) return cb(err)
                else return cb(null,result.user,result.network)
            })
        } else {
            auth.scAuth(access_token,needscredits,(err,user,network) => {
                if (err) return cb(err)
                else return cb(null,user,network)
            })
        }
    },
    decryptMessage: (message,cb) => {
        let decrypted = Crypto.AES.decrypt(message,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
        cb(decrypted)
    },
    invalidHiveUsername: (username) => {
        return Hive.utils.validateAccountName(username)
    },
    isInWhitelist: (username,network) => {
        if (!network && whitelist.includes(username))
            return true
        else if (whitelist.includes(username) || whitelist.includes(username + '@' + network))
            return true
        else return false
    },
    whitelist: () => {return whitelist},
    whitelistAdd: (username,network,cb,nowrite) => {
        let fullusername = username
        if (network && network != 'all') fullusername += '@' + network
        if (!auth.isInWhitelist(username,network)) {
            whitelist.push(fullusername)
            if (!nowrite) auth.writeWhitelistToDisk()
        }
        cb()
    },
    whitelistTrim: () => {
        // Trim whitelist
        for (let i = 0; i < whitelist.length; i++)
            if (whitelist[i] == '') {
                whitelist.splice(i,1)
                i--
            }
    },
    webhookAuth: (token,cb) => {
        // TODO: Update for new bot webhook system
    },
    writeWhitelistToDisk: () => {
        fs.writeFile('whitelist.txt',whitelist.join(EOL),(e) => {
            if (e) console.log('Error saving whitelist to disk: ' + e)
        })
    },
    stopWatchingOnWhitelist: () => {
        // For unit testing only
        whitelistWatcher.close()
    }
}

auth.whitelistTrim()
module.exports = auth