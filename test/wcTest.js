const WC = require('../wcHelper')
const Config = require('../config.json')
const assert = require('chai').assert

describe('WooCommerce Methods',() => {
    it('WC.TotalQuota should return an integer',(done) => {
        assert.typeOf(WC.TotalQuota(Config.test.user),'number')
        done()
    })

    it('WC.Users should return an object',(done) => {
        WC.User(Config.test.user,(err,info) => {
            if (!err) assert.typeOf(info,'object')
            done()
        })
    })

    it('WC.UserExists should return a boolean',(done) => {
        assert.typeOf(WC.UserExists(Config.test.user),'boolean')
        done()
    })
})