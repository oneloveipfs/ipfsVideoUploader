// Flat file JSON database manager
const fs = require('fs')

// Cache JSON data into variables
let usageData = JSON.parse(fs.readFileSync('db/usage.json','utf8'))
let hashes = JSON.parse(fs.readFileSync('db/hashes.json','utf8'))

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
    // Retrieve usage and hashes data
    getUsage: (username,cb) => {
        cb(usageData[username])
    },
    getTotalUsage: (username,cb) => {
        let qtotal = 0
        for (det in usageData[username]) {
            qtotal += usageData[username][det]
        }
        cb(qtotal)
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
    getHashesByUser: (types,username,cb) => {
        let hashesToReturn = {}

        for (let i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = hashes[username][possibleTypes[i]]
        }
        
        cb(hashesToReturn)
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
    }
}

module.exports = db