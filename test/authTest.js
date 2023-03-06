const assert = require('chai').assert
const Auth = require('../src/authManager')
const Config = require('../src/config')
const user = Config.test.user
const app = Config.tokenApp

Auth.loadKeys()

describe('Auth',() => {
    it('generateEncryptedMemo should return a string that starts with a #',function (done) {
        this.timeout(0)
        Auth.generateEncryptedMemo(user,(err,result) => {
            assert.typeOf(result,'string')
            assert.equal(result.charAt(0),'#')
            done()
        })
    })

    it('whitelist should be an array',function (done) {
        assert.typeOf(Auth.whitelist(),'array')
        done()
    })

    it('whitelistAdd should add new user to whitelist',function(done) {
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

    it('Deciphering unknown messages should return false',function (done) {
        Auth.decryptMessage('a',(decoded) => {
            assert.isFalse(decoded)
            done()
        })
    })

    it('Adding user to a network specific whitelist should not whitelist user for other networks',function (done) {
        Auth.whitelistAdd(Config.test.otherUser,'abc',() => {
            assert.isTrue(Auth.isInWhitelist(Config.test.otherUser,'abc'))
            assert.isFalse(Auth.isInWhitelist(Config.test.otherUser,'hive'))
            assert.isFalse(Auth.isInWhitelist(Config.test.otherUser,null))
            done()
        },true)
    })

    it('Adding user to Hive specific whitelist should not whitelist user for other networks (vice versa)',function (done) {
        Auth.whitelistAdd(Config.test.hiveUser,'hive',() => {
            assert.isTrue(Auth.isInWhitelist(Config.test.hiveUser,'hive'))
            assert.isFalse(Auth.isInWhitelist(Config.test.hiveUser,'abc'))
            assert.isFalse(Auth.isInWhitelist(Config.test.hiveUser,null))
            done()
        },true)
    })

    it('Network-specific user should only be authenticatable with the correct network',function (done) {
        Auth.generateJWT(Config.test.otherUser,'abc',(e,token) => Auth.verifyAuth(token,false,(verifyError,result) => {
            assert.notExists(verifyError)
            assert.equal(result.network,'abc')

            // Other networks should fail if whitelisting is enabled, else they should pass as well
            let completed = [false,false]
            function testResults() {
                if (completed[0] !== false && completed[1] !== false) {
                    if (Config.whitelistEnabled) {
                        assert.exists(completed[0])
                        assert.exists(completed[1])
                    } else {
                        assert.isNull(completed[0])
                        assert.isNull(completed[1])
                    }
                    done()
                }
            }

            Auth.generateJWT(Config.test.otherUser,'hive',(e,hiveToken) => Auth.verifyAuth(hiveToken,false,(hiveVerifyError) => {
                completed[0] = hiveVerifyError
                testResults()
            }))

            Auth.generateJWT(Config.test.otherUser,'all',(e,allToken) => Auth.verifyAuth(allToken,false,(allVerifyError) => {
                completed[1] = allVerifyError
                testResults()
            }))
        }))
    })

    it('Hive only user should only be authenticatable with the correct network',function (done) {
        Auth.generateJWT(Config.test.hiveUser,'hive',(e,token) => Auth.verifyAuth(token,false,(verifyError,result) => {
            assert.notExists(verifyError)
            assert.equal(result.network,'hive')

            // Other networks should fail if whitelisting is enabled, else they should pass as well
            let completed = [false,false]
            function testResults() {
                if (completed[0] !== false && completed[1] !== false) {
                    if (Config.whitelistEnabled) {
                        assert.exists(completed[0])
                        assert.exists(completed[1])
                    } else {
                        assert.isNull(completed[0])
                        assert.isNull(completed[1])
                    }
                    done()
                }
            }

            Auth.generateJWT(Config.test.hiveUser,'abc',(e,otherToken) => Auth.verifyAuth(otherToken,false,(otherVerifyError) => {
                completed[0] = otherVerifyError
                testResults()
            }))

            Auth.generateJWT(Config.test.hiveUser,'all',(e,allToken) => Auth.verifyAuth(allToken,false,(allVerifyError) => {
                completed[1] = allVerifyError
                testResults()
            }))
        }))
    })
})