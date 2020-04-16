const assert = require('chai').assert
const Shawp = require('../shawp')
const Config = require('../config.json')

let userAlreadyExist = Shawp.UserExists(Config.test.user)

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

    it('Shawp.ExchangeRate should return USD price of STEEM',(done) => {
        let isdone = false
        Shawp.ExchangeRate(Shawp.coins.Steem,1,(e,r) => {
            if (r) assert.typeOf(r,'number')
            if (!isdone) done()
            isdone = true
        })
    })

    it('Shawp.ExchangeRate should return USD price of SBD',(done) => {
        let isdone = false
        Shawp.ExchangeRate(Shawp.coins.SteemDollars,1,(e,r) => {
            if (r) assert.typeOf(r,'number')
            if (!isdone) done()
            isdone = true
        })
    })

    it('Shawp.AddUser should register a new customer',(done) => {
        Shawp.AddUser(Config.test.user)
        assert.equal(Shawp.UserExists(Config.test.user),true)

        let currentUser = Shawp.User(Config.test.user)
        if (!userAlreadyExist) assert.equal(currentUser.rate,Config.Shawp.DefaultUSDRate)
        if (!userAlreadyExist) assert.equal(currentUser.balance,0)
        assert.typeOf(currentUser.joinedSince,'number')
        done()
    })

    it('Shawp.Refill should top up hosting credits',(done) => {
        Shawp.Refill("Tester",Config.test.user,Shawp.methods.System,"",1)
        let newCredits = Math.floor(1 / Config.Shawp.DefaultUSDRate * 100000000)/100000000
        if (!userAlreadyExist) assert.equal(Shawp.User(Config.test.user).balance,newCredits)
        done()
    })

    it('Shawp.getRefillHistory should return array of refill history',(done) => {
        let history = Shawp.getRefillHistory(Config.test.user,0,1)
        assert.typeOf(history,'array')
        assert.typeOf(history[0],'object')
        assert.equal(JSON.stringify(history[0]),JSON.stringify({
            from: "Tester",
            method: 5,
            rawAmt: "",
            usdAmt: 1,
            credits: Math.floor(1 / Config.Shawp.DefaultUSDRate * 100000000)/100000000
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
        let history = Shawp.getConsumeHistory(Config.test.user,0,1)
        assert.typeOf(history,'array')
        for (let i = 0; i < history.length; i++) {
            assert.typeOf(history[i],'array')
            assert.typeOf(history[i][0],'string')
            assert.typeOf(history[i][1],'number')
        }
        done()
    })

    it('Shawp.getDaysRemaining should return days remaining with sufficient credits',(done) => {
        let daysLeft = Shawp.getDaysRemaining(Config.test.user)
        assert.typeOf(daysLeft.days,'number')
        if (daysLeft.needs) assert.typeOf(daysLeft.needs,'number')
        done()
    })
})