const assert = require('chai').assert
const db = require('../dbManager')
const fs = require('fs')

const hashes = JSON.parse(fs.readFileSync(__dirname + '/../db/hashes.json','utf8'))

describe('Database',() => {
    it('userExistInHashesDB should return a boolean',(done) => {
        db.userExistInHashesDB('techcoderx',(result) => {
            assert.typeOf(result,'boolean')
            done()
        })
    })

    it('getUsage should return numbers representing usage data in bytes',(done) => {
        db.getUsage('techcoderx',(result) => {
            for(let key in result) {
                if (result.hasOwnProperty(key)) {
                    assert.typeOf(result[key],'number')
                }
            }
            done()
        })
    })

    it('getHashes should return arrray of strings representing hashes',(done) => {
        db.getHashes(['videos','thumbnails'],(result) => {
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
        let user = 'techcoderx'
        db.getHashesByUser(['videos','thumbnails'],user,(result) => {
            for (let key in result) {
                if (result.hasOwnProperty(key)) {
                    assert.typeOf(result[key],'array')
                    if (result[key].length > 0) for (let i = 0; i < result[key].length; i++) {
                        assert.typeOf(result[key][i],'string')
                        assert.equal(result[key][i],hashes[user][key][i])
                    }
                }
            }
            done()
        })
    })
})