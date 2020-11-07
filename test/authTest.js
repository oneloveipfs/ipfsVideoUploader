const assert = require('chai').assert
const Auth = require('../authManager')
const Config = require('../config.json')
const user = Config.test.user
const app = Config.tokenApp

describe('Auth',() => {
    it('generateEncryptedMemo should return a string that starts with a #',function (done) {
        this.timeout(0)
        Auth.generateEncryptedMemo(user,(err,result) => {
            assert.typeOf(result,'string')
            assert.equal(result.charAt(0),'#')
            done()
        })
    })

    it('generateEncryptedMemoAvalon should return a string containing 4 sections',function(done) {
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
        Auth.whitelistAdd(user,'all',() => {
            assert.equal(Auth.isInWhitelist(user,'all'),true)
            done()
        },true)
    })

    it('generateJWT should return a valid JWT token',function (done) {
        Auth.generateJWT(user,'all',(err,token) => {
            assert.typeOf(token,'string')
            Auth.verifyAuth(token,false,(e,result) => {
                assert.isObject(result)
                assert.equal(result.user,user)
                assert.equal(result.app,app)
                assert.equal(result.network,'all')
                assert.isBelow(result.exp,Date.now())
                done()
            })
        })
    })
})

Auth.stopWatchingOnWhitelist()