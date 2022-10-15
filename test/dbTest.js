const assert = require('chai').assert
const db = require('../src/dbManager')
const Config = require('../src/config')

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

    it('getAliasedUsers should list all users aliased to a particular username',(done) => {
        assert.strictEqual(JSON.stringify(db.getAliasedUsers(Config.test.hiveUser,'hive')),JSON.stringify([{username:Config.test.aliasedUser,network:'dtc'}]))
        done()
    })

    it('unsetUserAlias should remove associations with main account',(done) => {
        assert.doesNotThrow(()=>db.unsetUserAlias(Config.test.hiveUser,'hive',Config.test.aliasedUser,'dtc'))
        assert.throws(()=>db.unsetUserAlias(Config.test.hiveUser,'hive',Config.test.aliasedUser,'dtc'))
        assert.isNull(db.getAliasOf(Config.test.aliasedUser,'dtc'))
        assert.equal(db.toFullUsername(Config.test.aliasedUser,'dtc',true),Config.test.aliasedUser+'@dtc')
        done()
    })

    it('uplThreads settings validator',(done) => {
        assert.isNotNull(db.settingsValidator.uplThreads('a'))
        assert.isNotNull(db.settingsValidator.uplThreads(true))
        assert.isNotNull(db.settingsValidator.uplThreads(false))
        assert.isNotNull(db.settingsValidator.uplThreads(null))
        assert.isNotNull(db.settingsValidator.uplThreads(0))
        assert.isNotNull(db.settingsValidator.uplThreads(51))
        assert.isNull(db.settingsValidator.uplThreads(1))
        assert.isNull(db.settingsValidator.uplThreads(50))
        assert.isNull(db.settingsValidator.uplThreads('6.9'))
        done()
    })

    it('descTemplate settings validator',(done) => {
        assert.isNotNull(db.settingsValidator.descTemplate(1))
        assert.isNotNull(db.settingsValidator.descTemplate(null))
        // 1,001 characters
        assert.isNotNull(db.settingsValidator.descTemplate('Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Na'))
        // 1,000 characters
        assert.isNull(db.settingsValidator.descTemplate('Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. N'))
        // 1 character
        assert.isNull(db.settingsValidator.descTemplate('a'))
        // 0 characters
        assert.isNull(db.settingsValidator.descTemplate(''))
        done()
    })

    it('darkMode settings validator',(done) => {
        assert.isNotNull(db.settingsValidator.darkMode('a'))
        assert.isNotNull(db.settingsValidator.darkMode(1))
        assert.isNotNull(db.settingsValidator.darkMode(null))
        assert.isNull(db.settingsValidator.darkMode(true))
        assert.isNull(db.settingsValidator.darkMode(false))
        done()
    })

    it('settingsTranslator should transform settings values to appropriate types',(done) => {
        assert.strictEqual(db.settingsTranslator.uplThreads('6.9'),6)
        assert.strictEqual(db.settingsTranslator.descTemplate('a'),'a')
        assert.isUndefined(db.settingsTranslator.descTemplate(''))
        assert.strictEqual(db.settingsTranslator.darkMode(true),true)
        assert.strictEqual(db.settingsTranslator.darkMode(false),false)
        done()
    })

    it('settingsUpdate should update user settings accordingly',(done) => {
        db.settingsUpdate(Config.test.user,'all','uplThreads','25')
        db.settingsUpdate(Config.test.user,'all','darkMode',true)
        assert.strictEqual(db.getUserInfo(Config.test.user,'all').settings.uplThreads,25)
        assert.strictEqual(db.getUserInfo(Config.test.user,'all').settings.darkMode,true)
        done()
    })
})