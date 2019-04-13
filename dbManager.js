// Flat file JSON database manager
const fs = require('fs')

// Cache JSON data into variables
var usageData = JSON.parse(fs.readFileSync('db/usage.json','utf8'));
var hashes = JSON.parse(fs.readFileSync('db/hashes.json','utf8'));

let possibleTypes = ['videos','thumbnails','sprites','images','video240','video480','video720','video1080']

let db = {
    // Check if user exist in hashes db
    userExistInHashesDB: (username,cb) => {
        if (!hashes.hasOwnProperty(username)) {
            cb(false)
        } else {
            cb(true)
        }
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
    getHashes: (types,cb) => {
        let hashesToReturn = {}
        function getAllHashes(hashType) {
            var hashArrToReturn = [];
            for(var key in hashes) {
                if (hashes.hasOwnProperty(key) && hashes[key][hashType] != undefined) {
                    hashArrToReturn = hashArrToReturn.concat(hashes[key][hashType]);
                }
            }
            return hashArrToReturn;
        }

        for (var i = 0; i < possibleTypes.length; i++) {
            if (types.includes(possibleTypes[i]))
                hashesToReturn[possibleTypes[i]] = getAllHashes(possibleTypes[i])
        }

        cb(hashesToReturn)
    },
    getHashesByUser: (types,username,cb) => {
        let hashesToReturn = {}

        for (var i = 0; i < possibleTypes.length; i++) {
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
        });
    },
    writeHashesData: () => {
        fs.writeFile('db/hashes.json',JSON.stringify(hashes),(err) => {
            if (err)
                console.log('Error saving hash logs: ' + err);
        });
    }
}

module.exports = db