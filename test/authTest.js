const assert = require('chai').assert
const Auth = require('../authManager')
const Keys = require('../.auth.json')
const user = 'techcoderx'

describe('Auth',function () {
    this.timeout(0)
    it('generateEncryptedMemo should return a string that starts with a #',function (done) {
        Auth.generateEncryptedMemo(user,(err,result) => {
            assert.typeOf(result,'string')
            assert.equal(result.charAt(0),'#')
            done()
        })
    })

    it('whitelist should be an array',function () {
        assert.typeOf(Auth.whitelist(),'array')
    })

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
})