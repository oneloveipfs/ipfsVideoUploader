const assert = require('chai').assert
const Auth = require('../authManager')
const Keys = require('../.auth.json')
const user = require('../config.json').test.user

describe('Auth',() => {
    if(Keys.wifMessage && Keys.wifMessage != "")
        it('generateEncryptedMemo should return a string that starts with a #',function (done) {
            this.timeout(0)
            Auth.generateEncryptedMemo(user,(err,result) => {
                assert.typeOf(result,'string')
                assert.equal(result.charAt(0),'#')
                done()
            })
        })
    else console.log('generateEncryptedMemo test skipped due to missing private key in .auth.json')

    
    it('whitelist should be an array',function (done) {
        assert.typeOf(Auth.whitelist(),'array')
        done()
    })

    it ('whitelistAdd() should add new user to whitelist',function(done) {
        let newUser = 'testy'
        Auth.whitelistAdd(newUser,() => {
            assert.equal(Auth.whitelist().includes(newUser),true)
            done()
        })
    })

    if(Keys.JWTKey && Keys.JWTKey != "") {
        let testToken

        it('generateJWT should return a string',function (done) {
            Auth.generateJWT(user,(err,result) => {
                testToken = result
                assert.typeOf(result,'string')
                done()
            })
        })

        it('verifyAuth should return a JWT decoded object',function (done) {
            Auth.verifyAuth(testToken,(err,result) => {
                assert.isObject(result)
                done()
            })
        })  
    } else console.log('generateJWT and verifyAuth test skipped due to missing passwords in .auth.json')
})

Auth.stopWatchingOnWhitelist()