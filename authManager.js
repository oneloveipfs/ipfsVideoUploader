const Steem = require('steem')
const SteemConnect = require('steemconnect')
const JWT = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const Crypto = require('crypto-js')
const fs = require('fs')
const Keys = require('./.auth.json')
const Config = require('./config.json')

Steem.api.setOptions({ url: 'https://api.hive.blog' })

// If whitelist file doesn't exist create it
if (Config.whitelistEnabled && !fs.existsSync('whitelist.txt'))
    fs.writeFileSync('./whitelist.txt','')

// Cache whitelist in a variable, and update variable when fs detects a file change
let whitelist = fs.readFileSync('whitelist.txt','utf8').split('\n')
let whitelistWatcher = fs.watch('whitelist.txt',() => {
    fs.readFile('whitelist.txt', 'utf8',(err,readList) => {
        if (err) return console.log('Error while updating whitelist: ' + err)
        whitelist = readList.split('\n')
        console.log(whitelist)
    })
})

let auth = {
    generateEncryptedMemo: (username,cb) => {
        // Generate encrypted text to be decrypted by Keychain or posting key on client
        let encrypted_message = Crypto.AES.encrypt(username + ':oneloveipfs_login',Keys.AESKey).toString()
        Steem.api.getAccounts([username],(err,res) => {
            if (err) return cb(err)
            let encrypted_memo = Steem.memo.encode(Keys.wifMessage,res[0].posting.key_auths[0][0],'#' + encrypted_message)
            cb(null,encrypted_memo)
        })
    },
    generateJWT: (user,cb) => {
        // Generate access token to be sent as response
        let timeNow = Date.now()
        JWT.sign({
            user: user,
            app: 'oneloveipfs',
            iat: timeNow / 1000,
            exp: (timeNow / 1000) + Config.tokenExpiry
        },Keys.JWTKey,(err,token) => {
            if (err) return cb('Error generating access token: ' + err)
            cb(null,token)
        })
    },
    verifyAuth: (access_token,cb) => {
        if (!access_token) return cb('Missing access token')
        JWT.verify(access_token,Keys.JWTKey,(err,result) => {
            if (err != null)
                cb('Login error: ' + err)
            else if (Config.whitelistEnabled === true)
                if (!whitelist.includes(result.user))
                    return cb('Looks like you do not have access to the uploader!')
            
            cb(null,result)
        })
    },
    scAuth: (access_token,cb) => {
        if (!access_token) return cb('Missing access token')
        let scapi = SteemConnect.Initialize({ accessToken: access_token })
        scapi.me((err,result) => {
            if (err) return cb(err)
            if (!whitelist.includes(result.account.name))
                return cb('Looks like you do not have access to the uploader!')
            cb(null,result.account.name)
        })
    },
    authenticate: (access_token,keychain,cb) => {
        if (Config.whitelistEnabled && !access_token) return cb('Missing API auth credentials') // response.status(400).send({error: 'Missing API auth credentials'})
        if (keychain === 'true') {
            auth.verifyAuth(access_token,(err,result) => {
                if (err) return cb(err)
                else return cb(null,result.user)
            })
        } else {
            auth.scAuth(access_token,(err,user) => {
                if (err) return cb(err)
                else return cb(null,user)
            })
        }
    },
    decryptMessage: (message,cb) => {
        let decrypted = Crypto.AES.decrypt(message,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
        cb(decrypted)
    },
    whitelist: () => {return whitelist},
    whitelistAdd: (username,cb) => {
        if (!whitelist.includes(username)) {
            whitelist.push(username)
            fs.writeFile('whitelist.txt',whitelist.join('\n'),() => {
                cb()
            })
        } else cb()
    },
    webhookAuth: (token,cb) => {
        // For custom webhooks
        bcrypt.compare(token,Keys.customwebhooktoken,(err,result) => {
            if (err) cb(err)
            else cb(null,result)
        })
    },
    stopWatchingOnWhitelist: () => {
        // For unit testing only
        whitelistWatcher.close()
    }
}

module.exports = auth