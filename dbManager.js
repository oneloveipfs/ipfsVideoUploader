// Flat file JSON database manager
const fs = require('fs')

// Cache JSON data into variables
let userInfo = JSON.parse(fs.readFileSync('db/userinfo.json','utf8'))
let usageData = JSON.parse(fs.readFileSync('db/usage.json','utf8'))
let hashes = JSON.parse(fs.readFileSync('db/hashes.json','utf8'))
let skylinks = JSON.parse(fs.readFileSync('db/skylinks.json','utf8'))

let possibleTypes = ['videos','thumbnails','sprites','images','video240','video480','video720','video1080','subtitles']

let db = {
    // Check if user exist in hashes db
    userExistInHashesDB: (username,network,cb) => {
        let fullusername = db.toFullUsername(username,network)
        if (!hashes.hasOwnProperty(fullusername)) {
            cb(false)
        } else {
            cb(true)
        }
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
    // Log usage data and IPFS hashes
    recordUsage: (username,network,type,size) => {
        let fullusername = db.toFullUsername(username,network)
        if (!usageData[fullusername]) {
            // New user?
            usageData[fullusername] = {}
        }

        if (!usageData[fullusername][type]) {
            usageData[fullusername][type] = size
        } else {
            usageData[fullusername][type] = usageData[fullusername][type] + size
        }
    },
    recordHash: (username,network,type,hash) => {
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
        return usageData[db.toFullUsername(username,network)] || {}
    },
    getTotalUsage: (username,network) => {
        let fullusername = db.toFullUsername(username,network)
        let qtotal = 0
        for (det in usageData[fullusername]) {
            qtotal += usageData[fullusername][det]
        }
        return qtotal
    },
    getAllUsage: (type,cb) => {
        let totalUse = 0
        for (let key in usageData) {
            if(usageData.hasOwnProperty(key)) {
                let use = usageData[key][type]
                if (!isNaN(use)) totalUse += use
            }
        }
        cb(totalUse)
    },
    getHashes: (types,cb) => {
        let hashesToReturn = {}
        function getAllHashes(hashType) {
            let hashArrToReturn = []
            for(let key in hashes) {
                if (hashes.hasOwnProperty(key) && hashes[key][hashType] != undefined) {
                    hashArrToReturn = hashArrToReturn.concat(hashes[key][hashType])
                }
            }
            return hashArrToReturn
        }

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = getAllHashes(possibleTypes[i])
        }

        cb(hashesToReturn)
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
    getHashesByUser: (types,username,network,cb) => {
        let fullusername = db.toFullUsername(username,network)
        let hashesToReturn = {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = hashes[fullusername][possibleTypes[i]]
        }
        
        cb(hashesToReturn)
    },
    getSkylinksByUser: (types,username,network,cb) => {
        let fullusername = db.toFullUsername(username,network)
        let skylinksToReturn = {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                skylinksToReturn[possibleTypes[i]] = skylinks[fullusername][possibleTypes[i]]
        }
        
        cb(skylinksToReturn)
    },
    // Write data in variables to disk
    writeUserInfoData: () => {
        fs.writeFile('db/userinfo.json',JSON.stringify(userInfo),(err) => {
            if (err)
                console.log('Error saving user info: ' + err)
        })
    },
    writeUsageData: () => {
        fs.writeFile('db/usage.json',JSON.stringify(usageData),(err) => {
            if (err)
                console.log('Error saving usage logs: ' + err)
        })
    },
    writeHashesData: () => {
        fs.writeFile('db/hashes.json',JSON.stringify(hashes),(err) => {
            if (err)
                console.log('Error saving hash logs: ' + err)
        })
    },
    writeSkylinksData: () => {
        fs.writeFile('db/skylinks.json',JSON.stringify(skylinks),(err) => {
            if (err)
                console.log('Error saving skylinks: ' + err)
        })
    },
    toFullUsername: (username,network,aliasOf) => {
        let result = username
        if (network && network != 'all') result += '@' + network
        if (aliasOf && db.getAliasOf(username,network))
            result = db.getAliasOf(username,network)
        return result
    }
}

module.exports = db