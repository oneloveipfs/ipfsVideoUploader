const axios = require('axios')
const HiveSigner = require('hivesigner')
const JWT = require('jsonwebtoken')
const Crypto = require('crypto-js')
const fs = require('fs')
const { EOL } = require('os')
const Config = require('./config')
const Shawp = require('./shawp')
const HivecryptPro = require('./hivecryptPro')
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
            wifMessage: HivecryptPro.hivecrypt.randomWif(),
            AESKey: HivecryptPro.hivecrypt.randomWif().slice(3,35),
            JWTKey: HivecryptPro.hivecrypt.randomWif().slice(3,35)
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
        let message = username + ':'+Config.ClientConfig.authIdentifier+':hive'
        if (auth.isInWhitelist(username,null))
            message = username + ':'+Config.ClientConfig.authIdentifier+':all'
        let encrypted_message = Crypto.AES.encrypt(message,Keys.AESKey).toString()
        axios.post(Config.Shawp.HiveAPI || 'https://techcoderx.com',{
            id: 1,
            jsonrpc: '2.0',
            method: 'condenser_api.get_accounts',
            params: [[username]]
        }).then(res => {
            if (res.data.result.length === 0)
                return cb('Account does not exist')
            let encrypted_memo
            try {
                encrypted_memo = HivecryptPro.hivecrypt.encode(Keys.wifMessage,res.data.result[0].posting.key_auths[0][0],'#' + encrypted_message)
            } catch (e) {
                console.log(e)
                return cb('Failed to generate memo to decode')
            }
            cb(null,encrypted_memo)
        }).catch(e => cb(e))
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
            if (err)
                cb('JWT error: ' + err)
            else if (Config.whitelistEnabled) {
                if (!auth.isInWhitelist(result.user,result.network))
                    return cb('Uploader access denied!')
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
                return cb('Uploader access denied!')
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
    authenticateBearer: (bearer) => {
        let parts = bearer.split('.')
        let kc = null
        if (parts.length < 2)
            return { error: 'Invalid auth token bearer format' }
        try {
            let part1 = JSON.parse(Buffer.from(parts[0],'base64').toString('utf-8'))
            if (part1.keychain === 'true' || part1.keychain === true)
                kc = 'true'
            else
                kc = 'false'
        } catch {
            return { error: 'Could not parse first part of bearer' }
        }
        parts.shift()
        return {
            token: parts.join('.'),
            kc: kc
        }
    },
    authenticateTus: (bearer,needscredits,cb) => {
        let bearerAuth = auth.authenticateBearer(bearer)
        if (bearerAuth.error)
            return cb(bearerAuth.error)
        auth.authenticate(bearerAuth.token,bearerAuth.kc,needscredits,cb)
    },
    decryptMessage: (message,cb) => {
        let decrypted
        try {
            decrypted = Crypto.AES.decrypt(message,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
        } catch {
            return cb(false)
        }
        if (decrypted.length !== 3 || decrypted[1] !== Config.ClientConfig.authIdentifier)
            cb(false)
        else cb(decrypted)
    },
    verifyAuthSignature: (message,cb) => {
        let split = message.split(':')
        if (split.length !== 6 ||
            split[1] !== Config.ClientConfig.authIdentifier ||
            split[2] !== 'hive' || // networks
            isNaN(parseInt(split[3])))
            return cb(false,'Invalid auth message format')
        let original = split.slice(0,5).join(':')
        let hash = HivecryptPro.sha256(original)
        switch (split[2]) {
            case 'hive':
                axios.post(Config.Shawp.HiveAPI,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'database_api.verify_signatures',
                    params: {
                        hash: hash.toString('hex'),
                        signatures: [split[5]],
                        required_owner: [],
                        required_active: [],
                        required_posting: [split[0]],
                        required_other: []
                    }
                }).then((r) => {
                    if (r.data && r.data.result && r.data.result.valid)
                        auth.verifyBlockInfo('hive',split[3],split[4],cb)
                    else
                        cb(false,'Invalid signature')
                }).catch(() => cb(false,'Failed to verify signature'))
                break
            default:
                break
        }
    },
    verifyBlockInfo: (network,number,id,cb) => {
        switch (network) {
            case 'hive':
                axios.post(Config.Shawp.HiveAPI,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_block',
                    params: [parseInt(number)]
                }).then(r => {
                    if (r.data && r.data.result && r.data.result.block_id === id)
                        return auth.verifyBlockExpiry(network,number,cb)
                    else
                        return cb(false,'Invalid block ID for block')
                }).catch(() => cb(false,'Could not verify block ID'))
                break
            default:
                break
        }
    },
    verifyBlockExpiry: (network,number,cb) => {
        switch (network) {
            case 'hive':
                axios.post(Config.Shawp.HiveAPI,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_dynamic_global_properties',
                    params: []
                }).then(r => {
                    if (r.data && r.data.result && r.data.result.head_block_number <= parseInt(number) + Config.ClientConfig.authTimeoutBlocks)
                        return cb(true)
                    else
                        return cb(false,'Block info specified timed out')
                }).catch(() => cb(false,'Could not verify block expiry'))
                break
            default:
                break
        }
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