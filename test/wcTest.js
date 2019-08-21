const WC = require('../wcHelper')
const Config = require('../config.json')
const assert = require('chai').assert

describe('WooCommerce Methods',() => {
    it('WC.TotalQuota should return an integer',(done) => {
        assert.typeOf(WC.TotalQuota(Config.test.user),'number')
        done()
    })

    it('WC.Users should return an object',(done) => {
        assert.typeOf(WC.User(Config.test.user),'object')
        done()
    })
})