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

    it('Adding user to Avalon specific whitelist should not whitelist user for other networks',function (done) {
        Auth.whitelistAdd(Config.test.dtcUser,'dtc',() => {
            assert.isTrue(Auth.isInWhitelist(Config.test.dtcUser,'dtc'))
            assert.isFalse(Auth.isInWhitelist(Config.test.dtcUser,'hive'))
            assert.isFalse(Auth.isInWhitelist(Config.test.dtcUser,null))
            done()
        },true)
    })

    it('Adding user to Hive specific whitelist should not whitelist user for other networks',function (done) {
        Auth.whitelistAdd(Config.test.hiveUser,'hive',() => {
            assert.isTrue(Auth.isInWhitelist(Config.test.hiveUser,'hive'))
            assert.isFalse(Auth.isInWhitelist(Config.test.hiveUser,'dtc'))
            assert.isFalse(Auth.isInWhitelist(Config.test.hiveUser,null))
            done()
        },true)
    })

    it('Avalon only user should only be authenticatable with the correct network',function (done) {
        Auth.generateJWT(Config.test.dtcUser,'dtc',(e,token) => Auth.verifyAuth(token,false,(verifyError,result) => {
            assert.notExists(verifyError)
            assert.equal(result.network,'dtc')

            // Other networks should fail
            let completed = [false,false]
            function testResults() {
                if (completed[0] !== false && completed[1] !== false) {
                    assert.exists(completed[0])
                    assert.exists(completed[1])
                    done()
                }
            }

            Auth.generateJWT(Config.test.dtcUser,'hive',(e,hiveToken) => Auth.verifyAuth(hiveToken,false,(hiveVerifyError) => {
                completed[0] = hiveVerifyError
                testResults()
            }))

            Auth.generateJWT(Config.test.dtcUser,'all',(e,allToken) => Auth.verifyAuth(allToken,false,(allVerifyError) => {
                completed[1] = allVerifyError
                testResults()
            }))
        }))
    })

    it('Hive only user should only be authenticatable with the correct network',function (done) {
        Auth.generateJWT(Config.test.hiveUser,'hive',(e,token) => Auth.verifyAuth(token,false,(verifyError,result) => {
            assert.notExists(verifyError)
            assert.equal(result.network,'hive')

            // Other networks should fail
            let completed = [false,false]
            function testResults() {
                if (completed[0] !== false && completed[1] !== false) {
                    assert.exists(completed[0])
                    assert.exists(completed[1])
                    done()
                }
            }

            Auth.generateJWT(Config.test.hiveUser,'dtc',(e,dtcToken) => Auth.verifyAuth(dtcToken,false,(dtcVerifyError) => {
                completed[0] = dtcVerifyError
                testResults()
            }))

            Auth.generateJWT(Config.test.hiveUser,'all',(e,allToken) => Auth.verifyAuth(allToken,false,(allVerifyError) => {
                completed[1] = allVerifyError
                testResults()
            }))
        }))
    })
})

Auth.stopWatchingOnWhitelist()