const axios = require('axios')
const Hivecrypt = require('hivecrypt')
const Avalon = require('javalon')
const HiveSigner = require('hivesigner')
const JWT = require('jsonwebtoken')
const Crypto = require('crypto-js')
const fs = require('fs')
const { EOL } = require('os')
const Config = require('./config')
const Shawp = require('./shawp')
const dir = process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs'

// If whitelist file doesn't exist create it
if (!fs.existsSync(dir+'/whitelist.txt'))
    fs.writeFileSync(dir+'/whitelist.txt','')

// Cache whitelist in a variable, and update variable when fs detects a file change
let whitelist = fs.readFileSync(dir+'/whitelist.txt','utf8').split(EOL)

let Keys = {}

let auth = {
    loadKeys: () => {
        if (fs.existsSync(dir+'/.auth.json'))
            Keys = JSON.parse(fs.readFileSync(dir+'/.auth.json'))
        else
            auth.refreshKeys()
    },
    refreshKeys: () => {
        Keys = auth.keygen()
        if (!fs.existsSync(dir)) fs.mkdirSync(dir)
        fs.writeFileSync(dir+'/.auth.json',JSON.stringify(Keys,null,4))
    },
    keygen: () => {
        return {
            wifMessage: Hivecrypt.randomWif(),
            AESKey: Hivecrypt.randomWif().substr(3,32),
            JWTKey: Hivecrypt.randomWif().substr(3,32),
            avalonKeypair: Avalon.keypair()
        }
    },
    watch: () => {
        // Watch for external whitelist.txt changes
        if (!Config.whitelistEnabled) return
        fs.watch(dir+'/whitelist.txt',() => {
            fs.readFile(dir+'/whitelist.txt', 'utf8',(err,readList) => {
                if (err) return console.log('Error while updating whitelist: ' + err)
                whitelist = readList.split(EOL)
                auth.whitelistTrim()
            })
        })
    },
    generateEncryptedMemo: (username,cb) => {
        // Generate encrypted text to be decrypted by Keychain or posting key on client
        let message = username + ':oneloveipfs_login:hive'
        if (auth.isInWhitelist(username,null))
            message = username + ':oneloveipfs_login:all'
        else if (auth.isInWhitelist(username,'dtc'))
            message = username + ':oneloveipfs_login:dtc'
        let encrypted_message = Crypto.AES.encrypt(message,Keys.AESKey).toString()
        axios.post(Config.Shawp.HiveAPI || 'https://hived.techcoderx.com',{
            id: 1,
            jsonrpc: '2.0',
            method: 'condenser_api.get_accounts',
            params: [[username]]
        }).then(res => {
            let encrypted_memo
            try {
                encrypted_memo = Hivecrypt.encode(Keys.wifMessage,res.data.result[0].posting.key_auths[0][0],'#' + encrypted_message)
            } catch (e) {
                console.log(e)
                return cb('Failed to generate memo to decode')
            }
            cb(null,encrypted_memo)
        }).catch(e => cb(e))
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
            } else cb(null,result)
        })
    },
    scAuth: (access_token,needscredits,cb) => {
        if (!access_token) return cb('Missing access token')
        let scapi = new HiveSigner.Client({ accessToken: access_token })
        scapi.me((err,result) => {
            if (err) return cb(err)
            if (Config.whitelistEnabled && !auth.isInWhitelist(result.user,'hive'))
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
        let decrypted
        try {
            decrypted = Crypto.AES.decrypt(message,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
        } catch {
            cb(false)
        }
        if (decrypted.length !== 3 || decrypted[1] !== 'oneloveipfs_login')
            cb(false)
        else cb(decrypted)
    },
    invalidHiveUsername: (value) => {
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
    whitelistRm: (username,network,nowrite) => {
        let fullusername = require('./dbManager').toFullUsername(username,network)
        for (let i in whitelist) {
            if (whitelist[i] === fullusername) {
                whitelist.splice(i,1)
                if (!nowrite) auth.writeWhitelistToDisk()
                break
            }
        }
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
        fs.writeFile(dir+'/whitelist.txt',whitelist.join(EOL),(e) => {
            if (e) console.log('Error saving whitelist to disk: ' + e)
        })
    }
}

auth.whitelistTrim()
module.exports = auth