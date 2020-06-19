const assert = require('chai').assert
const Auth = require('../authManager')
const Keys = require('../.auth.json')
const user = require('../config.json').test.user

describe('Auth',() => {
    it('generateEncryptedMemo should return a string that starts with a #',function (done) {
        this.timeout(0)
        Auth.generateEncryptedMemo(user,(err,result) => {
            assert.typeOf(result,'string')
            assert.equal(result.charAt(0),'#')
            done()
        })
    })

    it('generateEncryptedMemoAvalon should return a string that has 4 \'_\'s',function(done) {
        this.timeout(0)
        Auth.generateEncryptedMemoAvalon(user,null,(err,result) => {
            let splitMessage = result.split('_')
            assert.typeOf(result,'string')
            assert.equal(splitMessage.length,4)
            done()
        })
    })

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

    let testToken

    it('generateJWT should return a string',function (done) {
        Auth.generateJWT(user,(err,result) => {
            if (err) console.log(err)
            testToken = result
            assert.typeOf(result,'string')
            done()
        })
    })

    it('verifyAuth should return a JWT decoded object',function (done) {
        Auth.verifyAuth(testToken,false,(err,result) => {
            assert.isObject(result)
            done()
        })
    })  
})

Auth.stopWatchingOnWhitelist()