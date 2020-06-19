const assert = require('chai').assert
const db = require('../dbManager')
const fs = require('fs')
const Config = require('../config.json')

const hashes = JSON.parse(fs.readFileSync(__dirname + '/../db/hashes.json','utf8'))

describe('Database',() => {
    it('userExistInHashesDB should return a boolean',(done) => {
        db.userExistInHashesDB(Config.test.user,'all',(result) => {
            assert.typeOf(result,'boolean')
            done()
        })
    })

    it('getUsage should return numbers representing usage data in bytes',(done) => {
        let usage = db.getUsage(Config.test.user,'all')
        for(let key in usage) {
            if (usage.hasOwnProperty(key)) {
                assert.typeOf(usage[key],'number')
            }
        }
        done()
    })

    it('getAllUsage should return numbers representing total usage data for specific hash type for all users in bytes',(done) => {
        db.getAllUsage(Config.test.hashType[0],(result) => {
            assert.typeOf(result,'number')
            done()
        })
    })

    it('getHashes should return arrray of strings representing hashes',(done) => {
        db.getHashes(Config.test.hashType,(result) => {
            for (let key in result) {
                if (result.hasOwnProperty(key)) {
                    assert.typeOf(result[key],'array')
                    if (result[key].length > 0) for (let i = 0; i < result[key].length; i++) {
                        assert.typeOf(result[key][i],'string')
                    }
                }
            }
            done()
        })
    })

    it('getHashesByUser should return arrray of strings representing hashes for a particular user',(done) => {
        if (!Config.test.hashType || Config.test.hashType === []) return done()
        for(let i = 0; i < Config.test.hashType.length; i++) {
            // Record test hash (which are not valid ipfs hash) if no hash in hashes.json for user
            if (!hashes[Config.test.user]) {
                db.recordHash(Config.test.user,'all',Config.test.hashType[i],'Qmtesthash123')
                hashes[Config.test.user] = {[Config.test.hashType[i]]: 'Qmtesthash123'}
            } else if (!hashes[Config.test.user][Config.test.hashType[i]]) {
                db.recordHash(Config.test.user,'all',Config.test.hashType[i],'Qmtesthash123')
                hashes[Config.test.user][Config.test.hashType[i]] = 'Qmtesthash123'
            }
        }

        db.getHashesByUser(Config.test.hashType,Config.test.user,'all',(result) => {
            for (let key in result) {
                if (result.hasOwnProperty(key)) {
                    assert.typeOf(result[key],'array')
                    if (result[key].length > 0) for (let i = 0; i < result[key].length; i++) {
                        assert.typeOf(result[key][i],'string')
                    }
                }
            }
            done()
        })
    })

    it('Possible hash types should be an array with strings',(done) => {
        assert.typeOf(db.getPossibleTypes(),'array')
        for(let i = 0; i < db.getPossibleTypes().length; i++) {
            assert.typeOf(db.getPossibleTypes()[i],'string')
        }
        done()
    })
})