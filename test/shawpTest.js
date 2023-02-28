const assert = require('chai').assert
const Shawp = require('../src/shawp')
const Config = require('../src/config')

let userAlreadyExist = Shawp.UserExists(Config.test.user,'all')

describe('Shawp',() => {
    it('Shawp.ExchangeRate should return USD price of HIVE',(done) => {
        let isdone = false
        Shawp.ExchangeRate(Shawp.coins.Hive,1,(e,r) => {
            if (r) assert.typeOf(r,'number')
            if (!isdone) done()
            isdone = true
        })
    })

    it('Shawp.ExchangeRate should return USD price of HBD',(done) => {
        let isdone = false
        Shawp.ExchangeRate(Shawp.coins.HiveDollars,1,(e,r) => {
            if (r) assert.typeOf(r,'number')
            if (!isdone) done()
            isdone = true
        })
    })

    it('Shawp.ValidatePayment should parse memos attached to payments correctly',(done) => {
        assert.equal(Shawp.ValidatePayment(Config.test.user,'a').length,0)
        assert.equal(JSON.stringify(Shawp.ValidatePayment(Config.test.user,'')),'["'+Config.test.user+'","all"]')
        assert.equal(JSON.stringify(Shawp.ValidatePayment(Config.test.user,'')),'["' + Config.test.user + '","all"]')
        assert.equal(JSON.stringify(Shawp.ValidatePayment(Config.test.user,'to: @'+Config.test.user)),'["' + Config.test.user + '","all"]')
        assert.equal(JSON.stringify(Shawp.ValidatePayment(Config.test.user,'to: hive@'+Config.test.user)),'["' + Config.test.user + '","hive"]')
        assert.equal(JSON.stringify(Shawp.ValidatePayment(Config.test.user,'to: dtc@'+Config.test.user)),'["' + Config.test.user + '","dtc"]')
        done()
    })

    it('Shawp.AddUser should register a new customer',(done) => {
        Shawp.AddUser(Config.test.user,'all',true)
        assert.equal(Shawp.UserExists(Config.test.user),true)

        let currentUser = Shawp.User(Config.test.user)
        if (!userAlreadyExist) assert.equal(currentUser.rate,Config.Shawp.DefaultUSDRate)
        if (!userAlreadyExist) assert.equal(currentUser.balance,0)
        assert.typeOf(currentUser.joinedSince,'number')
        done()
    })

    it('Shawp.AddUser with network should only add user to network specific whitelist',(done) => {
        Shawp.AddUser(Config.test.avalonUser+'2','dtc',true)
        assert.isTrue(Shawp.UserExists(Config.test.avalonUser+'2','dtc'))
        assert.isFalse(Shawp.UserExists(Config.test.avalonUser+'2','hive'))
        assert.isFalse(Shawp.UserExists(Config.test.avalonUser+'2'))

        Shawp.AddUser(Config.test.hiveUser+'2','hive',true)
        assert.isTrue(Shawp.UserExists(Config.test.hiveUser+'2','hive'))
        assert.isFalse(Shawp.UserExists(Config.test.hiveUser+'2','dtc'))
        assert.isFalse(Shawp.UserExists(Config.test.hiveUser+'2'))

        done()
    })

    let refillTs = new Date().getTime()
    it('Shawp.Refill should top up hosting credits',(done) => {
        Shawp.Refill("Tester",Config.test.user,'all',Shawp.methods.System,"",refillTs,"",1)
        let newCredits = Math.floor(1 / Config.Shawp.DefaultUSDRate * 100000000)/100000000
        if (!userAlreadyExist) assert.equal(Shawp.User(Config.test.user).balance,newCredits)
        done()
    })

    it('Shawp.getRefillHistory should return array of refill history',(done) => {
        let history = Shawp.getRefillHistory(Config.test.user,'all',0,1)
        assert.typeOf(history,'array')
        assert.typeOf(history[0],'object')
        assert.equal(JSON.stringify(history[0]),JSON.stringify({
            from: "Tester",
            method: 5,
            rawAmt: "",
            usdAmt: 1,
            credits: Math.floor(1 / Config.Shawp.DefaultUSDRate * 100000000)/100000000,
            ts: refillTs,
            txid: ""
        }))
        done()
    })

    it('Shawp.Consume should deduct credit balances',(done) => {
        let oldbal = Shawp.User(Config.test.user).balance
        Shawp.Consume()
        let newbal = Shawp.User(Config.test.user).balance
        assert.isTrue(newbal <= oldbal)
        done()
    })

    it('Shawp.getConsumeHistory should return daily credits consumption history',(done) => {
        let history = Shawp.getConsumeHistory(Config.test.user,'all',0,1)
        assert.typeOf(history,'array')
        for (let i = 0; i < history.length; i++) {
            assert.typeOf(history[i],'array')
            assert.typeOf(history[i][0],'string')
            assert.typeOf(history[i][1],'number')
            assert.isAbove(history[i][1],0)
        }
        done()
    })

    it('Shawp.getDaysRemaining should return days remaining with sufficient credits',(done) => {
        let daysLeft = Shawp.getDaysRemaining(Config.test.user,'all')
        assert.typeOf(daysLeft.days,'number')
        if (daysLeft.needs) assert.typeOf(daysLeft.needs,'number')
        done()
    })
})