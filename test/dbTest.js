const assert = require('chai').assert
const db = require('../dbManager')
const Config = require('../config.json')

describe('Database',() => {
    it('userExistInHashesDB should return a boolean',(done) => {
        assert.typeOf(db.userExistInHashesDB(Config.test.user,'all'),'boolean')
        done()
    })

    it('getUsage should return numbers representing usage data in bytes',(done) => {
        let usage = db.getUsage(Config.test.user,'all')
        for(let key in usage) {
            assert.typeOf(usage[key],'number')
            assert.isAtLeast(usage[key],0)
        }
        done()
    })

    it('getAllUsage should return numbers representing total usage data for all users in bytes',(done) => {
        let allusage = db.getAllUsage()
        assert.typeOf(allusage,'number')
        assert.isAtLeast(allusage,0)
        done()
    })

    it('getHashes should return arrray of strings representing hashes',(done) => {
        let result = db.getHashes(Config.test.hashType)
        for (let key in result) {
            assert.typeOf(result[key],'array')
            if (result[key].length > 0) for (let i = 0; i < result[key].length; i++) {
                assert.typeOf(result[key][i],'string')
            }
        }
        done()
    })

    it('getHashesByUser should return arrray of strings representing hashes for a particular user',(done) => {
        if (!Config.test.hashType || Config.test.hashType === []) return done()
        for(let i = 0; i < Config.test.hashType.length; i++) {
            // Record some test hashes
            db.recordHash(Config.test.user,'all',Config.test.hashType[i],'Qmtesthash123',1073741824)
            db.recordHash(Config.test.user,'all',Config.test.hashType[i],'Qmtesthash124',1073741824)
            db.recordHash(Config.test.user,'all',Config.test.hashType[i],'Qmtesthash125',1073741824)
        }

        let result = db.getHashesByUser(Config.test.hashType,Config.test.user,'all')
        for (let key in result) {
            assert.typeOf(result[key],'array')
            if (result[key].length > 0) for (let i = 0; i < result[key].length; i++) {
                assert.typeOf(result[key][i],'string')
            }
        }
        done()
    })

    it('Possible hash types should be an array with strings',(done) => {
        assert.typeOf(db.getPossibleTypes(),'array')
        for(let i = 0; i < db.getPossibleTypes().length; i++) {
            assert.typeOf(db.getPossibleTypes()[i],'string')
        }
        done()
    })

    it('setUserAlias should add a user as alias to another main account',(done) => {
        db.setUserAlias(Config.test.hiveUser,'hive',Config.test.aliasedUser,'dtc')
        assert.isNotNull(db.getAliasOf(Config.test.aliasedUser,'dtc'))
        assert.equal(db.toFullUsername(Config.test.aliasedUser,'dtc',true),Config.test.hiveUser+'@hive')
        done()
    })

    it('setUserAlias should throw when adding another aliased user as an alias',(done) => {
        assert.throws(()=>{db.setUserAlias(Config.test.aliasedUser,'dtc','smith','all')})
        done()
    })

    it('unsetUserAlias should remove associations with main account',(done) => {
        db.unsetUserAlias(Config.test.aliasedUser,'dtc')
        assert.isNull(db.getAliasOf(Config.test.aliasedUser,'dtc'))
        assert.equal(db.toFullUsername(Config.test.aliasedUser,'dtc',true),Config.test.aliasedUser+'@dtc')
        done()
    })
})