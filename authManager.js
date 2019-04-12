const Steem = require('steem')
const JWT = require('jsonwebtoken')
const Crypto = require('crypto-js')
const Keys = require('./.auth.json')
const Config = require('./config.json')

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
            else if (Config.whitelistEnabled == true)
                if (!whitelist.includes(result.user))
                    return cb('Looks like you do not have access to the uploader!')
            
            cb(null,result)
        })
    },
    decryptMessage: (message,cb) => {
        let decrypted = Crypto.AES.decrypt(message,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
        cb(decrypted)
    }
}

module.exports = auth