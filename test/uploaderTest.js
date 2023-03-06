const assert = require('chai').assert
const uploader = require('../src/ipfsUploadHandler')
const Config = require('../src/config')
const hiveEncoder = Config.test.hiveUser+'@hive'
const random = uploader.IPSync.randomID()

describe('Uploader',() => {
    it('randomID should generate a random 15-char string',(done) => {
        let rd = uploader.IPSync.randomID()
        assert.isString(rd)
        assert.strictEqual(rd.length,15)

        let rd2 = uploader.IPSync.randomID()
        assert.isFalse(rd === rd2)
        done()
    })

    it('remoteEncoderRegister should register a new remote encoder into the registry',(done) => {
        uploader.remoteEncoderRegister(hiveEncoder,null,'libx264','-crf 18',[1080,720,480],1024*1024*1024)
        let newEncoder = uploader.remoteEncoderStatus()[hiveEncoder]
        assert.isNotEmpty(newEncoder)
        done()
    })

    it('remoteEncoderStatus should return remote encoder details',(done) => {
        let encoders = uploader.remoteEncoderStatus()
        assert.isObject(encoders)
        assert.isObject(encoders[hiveEncoder])
        assert.strictEqual(encoders[hiveEncoder].encoder,'libx264')
        assert.strictEqual(encoders[hiveEncoder].quality,'-crf 18')
        assert.deepStrictEqual(encoders[hiveEncoder].outputs,[1080,720,480])
        assert.strictEqual(encoders[hiveEncoder].maxSize,1024*1024*1024)
        assert.isFalse(encoders[hiveEncoder].active)
        assert.isArray(encoders[hiveEncoder].queue)
        assert.isString(encoders[hiveEncoder].processing)
        done()
    })

    it('remoteEncoderPushJob should push incoming encoding jobs to queue',(done) => {
        uploader.remoteEncoderPushJob(hiveEncoder,random,Config.test.aliasedUser,'all',100,true,null)

        let encoders = uploader.remoteEncoderStatus()
        assert.strictEqual(encoders[hiveEncoder].queue.length,1)
        assert.strictEqual(encoders[hiveEncoder].queue[0],random)
        done()
    })

    it('remoteEncoding should return ID of first item in encoding queue',(done) => {
        uploader.remoteEncoderPushJob(hiveEncoder,uploader.IPSync.randomID(),Config.test.aliasedUser,'all',200,true,null)
        uploader.remoteEncoderPushJob(hiveEncoder,uploader.IPSync.randomID(),Config.test.otherUser,'abc',200,true,null)
        let encodingID = uploader.remoteEncoding(hiveEncoder)
        assert.strictEqual(encodingID,random)
        done()
    })
})