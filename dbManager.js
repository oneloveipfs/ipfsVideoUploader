// Flat file JSON database manager
const fs = require('fs')

// Cache JSON data into variables
let usageData = JSON.parse(fs.readFileSync('db/usage.json','utf8'))
let hashes = JSON.parse(fs.readFileSync('db/hashes.json','utf8'))
let skylinks = JSON.parse(fs.readFileSync('db/skylinks.json','utf8'))

let possibleTypes = ['videos','thumbnails','sprites','images','video240','video480','video720','video1080','subtitles']

let db = {
    // Check if user exist in hashes db
    userExistInHashesDB: (username,cb) => {
        if (!hashes.hasOwnProperty(username)) {
            cb(false)
        } else {
            cb(true)
        }
    },
    getPossibleTypes: () => {
        return possibleTypes
    },
    allUsersCount: () => {
        return Object.keys(usageData).length
    },
    // Log usage data and IPFS hashes
    recordUsage: (username,type,size) => {
        if (!usageData[username]) {
            // New user?
            usageData[username] = {}
        }

        if (!usageData[username][type]) {
            usageData[username][type] = size
        } else {
            usageData[username][type] = usageData[username][type] + size
        }
    },
    recordHash: (username,type,hash) => {
        if (!hashes[username]) {
            hashes[username] = {
                videos: [],
                thumbnails: [],
                sprites: [],
                images: [],
            }
        }

        if (!hashes[username][type]) {
            hashes[username][type] = []
        }

        if (!hashes[username][type].includes(hash))
            hashes[username][type].push(hash)
    },
    recordSkylink: (username,type,skylink) => {
        if (!skylinks[username])
            skylinks[username] = {
                videos: []
            }

        if (!skylinks[username][type]) skylinks[username][type] = []
        if (!skylinks[username][type].includes(skylink))
            skylinks[username][type].push(skylink)
    },
    // Retrieve usage and hashes data
    getUsage: (username,cb) => {
        cb(usageData[username])
    },
    getTotalUsage: (username) => {
        let qtotal = 0
        for (det in usageData[username]) {
            qtotal += usageData[username][det]
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
    getHashesByUser: (types,username,cb) => {
        let hashesToReturn = {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = hashes[username][possibleTypes[i]]
        }
        
        cb(hashesToReturn)
    },
    getSkylinksByUser: (types,username,cb) => {
        let skylinksToReturn = {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                skylinksToReturn[possibleTypes[i]] = skylinks[username][possibleTypes[i]]
        }
        
        cb(skylinksToReturn)
    },
    // Write data in variables to disk
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
    }
}

module.exports = db