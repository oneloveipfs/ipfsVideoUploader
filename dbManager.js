// Flat file JSON database manager
const fs = require('fs')
const dir = require('os').homedir() + '/.oneloveipfs'
const dbDir = dir+'/db'

// Create files if not exist already
const setupDb = (db) => {
    if (!fs.existsSync(dbDir)) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir)
        fs.mkdirSync(dbDir)
    } 
    try {
        fs.openSync(dbDir+'/'+db+'.json','r')
    } catch (error) {
        fs.writeFileSync(dbDir+'/'+db+'.json','{}')
    }
}
setupDb('userinfo')
setupDb('hashsizes')
setupDb('hashes')
setupDb('skylinks')

// Cache JSON data into variables
let userInfo = JSON.parse(fs.readFileSync(dbDir+'/userinfo.json','utf8'))
let hashSizes = JSON.parse(fs.readFileSync(dbDir+'/hashsizes.json','utf8'))
let hashes = JSON.parse(fs.readFileSync(dbDir+'/hashes.json','utf8'))
let skylinks = JSON.parse(fs.readFileSync(dbDir+'/skylinks.json','utf8'))

let possibleTypes = ['videos','thumbnails','sprites','images','video240','video480','video720','video1080','subtitles','streams']

let db = {
    // Check if user exist in hashes db
    userExistInHashesDB: (username,network) => {
        let fullusername = db.toFullUsername(username,network)
        if (!hashes.hasOwnProperty(fullusername))
            return false
        else
            return true
    },
    getPossibleTypes: () => {
        return possibleTypes
    },
    allUsersCount: () => {
        return Object.keys(hashes).length
    },
    // User info (aliases, user settings etc.)
    setUserAlias: (mainUser,mainNetwork,aliasUser,aliasNetwork) => {
        let fullMain = db.toFullUsername(mainUser,mainNetwork)
        let fullAlias = db.toFullUsername(aliasUser,aliasNetwork)
        if (userInfo[fullMain] && userInfo[fullMain].aliasOf)
            throw 'Cannot set user alias to another aliased user'
        if (!userInfo[fullAlias]) userInfo[fullAlias] = {}
        userInfo[fullAlias].aliasOf = fullMain
    },
    unsetUserAlias: (aliasUser,aliasNetwork) => {
        let fullAlias = db.toFullUsername(aliasUser,aliasNetwork)
        if (userInfo[fullAlias] && userInfo[fullAlias].aliasOf)
            delete userInfo[fullAlias].aliasOf
    },
    getAliasOf: (username,network) => {
        let fullusername = db.toFullUsername(username,network)
        if (!userInfo[fullusername] || !userInfo[fullusername].aliasOf)
            return null
        else
            return userInfo[fullusername].aliasOf
    },
    recordHash: (username,network,type,hash,size) => {
        if (!hash && !size) return
        let fullusername = db.toFullUsername(username,network)
        if (!hashes[fullusername]) {
            hashes[fullusername] = {
                videos: [],
                thumbnails: [],
                sprites: [],
                images: [],
            }
        }

        if (!hashes[fullusername][type]) {
            hashes[fullusername][type] = []
        }

        if (!hashes[fullusername][type].includes(hash))
            hashes[fullusername][type].push(hash)
        
        // Record size of file
        if (size > 0)
            hashSizes[hash] = size
    },
    recordSkylink: (username,network,type,skylink) => {
        let fullusername = db.toFullUsername(username,network)
        if (!skylinks[fullusername])
            skylinks[fullusername] = {
                videos: []
            }

        if (!skylinks[fullusername][type]) skylinks[fullusername][type] = []
        if (!skylinks[fullusername][type].includes(skylink))
            skylinks[fullusername][type].push(skylink)
    },
    // Retrieve usage and hashes data
    getUsage: (username,network) => {
        let result = {}
        let userHashes = db.getHashesByUser(possibleTypes,username,network)
        for (hashtype in userHashes) {
            result[hashtype] = 0
            for (h in userHashes[hashtype]) {
                if (typeof hashSizes[userHashes[hashtype][h]] == 'number')
                    result[hashtype] += hashSizes[userHashes[hashtype][h]]
            }
        }
        return result
    },
    getTotalUsage: (username,network) => {
        let usageDet = db.getUsage(username,network)
        let qtotal = 0
        for (det in usageDet) {
            qtotal += usageDet[det]
        }
        return qtotal
    },
    getAllUsage: () => {
        let totalUse = 0
        for (let fulluser in hashes)
            totalUse += db.getTotalUsage(db.toUsername(fulluser),db.toNetwork(fulluser))
        return totalUse
    },
    getHashes: (types) => {
        let hashesToReturn = {}
        function getAllHashes(hashType) {
            let hashArrToReturn = []
            for(let key in hashes) {
                if (hashes[key][hashType]) {
                    hashArrToReturn = hashArrToReturn.concat(hashes[key][hashType])
                }
            }
            return hashArrToReturn
        }

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = getAllHashes(possibleTypes[i])
        }

        return hashesToReturn
    },
    getSkylinks: (types,cb) => {
        let skylinksToReturn = {}
        function getAllSkylinks(linkType) {
            let skylinkArrToReturn = []
            for(let key in skylinks) {
                if (skylinks.hasOwnProperty(key) && skylinks[key][linkType] != undefined) {
                    skylinkArrToReturn = skylinkArrToReturn.concat(skylinks[key][linkType])
                }
            }
            return skylinkArrToReturn
        }

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                skylinksToReturn[possibleTypes[i]] = getAllSkylinks(possibleTypes[i])
        }

        cb(skylinksToReturn)
    },
    getHashesByUser: (types,username,network) => {
        let fullusername = db.toFullUsername(username,network)
        let hashesToReturn = {}

        if (!hashes[fullusername]) return {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = hashes[fullusername][possibleTypes[i]]
        }
        
        return hashesToReturn
    },
    getSkylinksByUser: (types,username,network,cb) => {
        let fullusername = db.toFullUsername(username,network)
        let skylinksToReturn = {}

        if (!skylinks[fullusername]) return {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                skylinksToReturn[possibleTypes[i]] = skylinks[fullusername][possibleTypes[i]]
        }
        
        cb(skylinksToReturn)
    },
    getSizeByHash: (hash) => {
        return hashSizes[hash] || null
    },
    setupDb,
    // Write data in variables to disk
    writeUserInfoData: () => {
        fs.writeFile(dbDir+'/userinfo.json',JSON.stringify(userInfo),(err) => {
            if (err)
                console.log('Error saving user info: ' + err)
        })
    },
    writeHashesData: () => {
        fs.writeFile(dbDir+'/hashes.json',JSON.stringify(hashes),(err) => {
            if (err)
                console.log('Error saving hash logs: ' + err)
        })
    },
    writeHashSizesData: () => {
        fs.writeFile(dbDir+'/hashsizes.json',JSON.stringify(hashSizes),(err) => {
            if (err)
                console.log('Error saving hash sizes: ' + err)
        })
    },
    writeSkylinksData: () => {
        fs.writeFile(dbDir+'/skylinks.json',JSON.stringify(skylinks),(err) => {
            if (err)
                console.log('Error saving skylinks: ' + err)
        })
    },
    // Username helpers
    toFullUsername: (username,network,aliasOf) => {
        let result = username
        if (network && network != 'all') result += '@' + network
        if (aliasOf && db.getAliasOf(username,network))
            result = db.getAliasOf(username,network)
        return result
    },
    toUsername: (fullusername) => {
        return fullusername.split('@')[0]
    },
    toNetwork: (fullusername) => {
        let parts = fullusername.split('@')
        if (parts.length > 1)
            return parts[1]
        else
            return 'all'
    },
    isValidAvalonUsername: (username) => {
        let allowedUsernameChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let allowedUsernameCharsOnlyMiddle = '-.'
        username = username.toLowerCase()
        for (let i = 0; i < username.length; i++) {
            const c = username[i]
            // allowed username chars
            if (allowedUsernameChars.indexOf(c) === -1) 
                if (allowedUsernameCharsOnlyMiddle.indexOf(c) === -1)
                    return 'invalid character ' + c
                else if (i === 0 || i === username.length-1)
                    return 'character ' + c + ' can only be in the middle'
        }
        return null
    }
}

module.exports = db