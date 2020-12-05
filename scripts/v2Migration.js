/* 
 * IMPORTANT - DO THIS FIRST TO PREVENT DATA LOSS:
 *
 * cp db db2
 * git pull
 * mv db2 db
*/
const hashes = require('../db/hashes.json')
const axios = require('axios')
const fs = require('fs')
let hashSizes = {}

const migrate = async (cb) => {
    for (user in hashes) for (hashtype in hashes[user]) for (h in hashes[user][hashtype]) {
        try {
            let res = await axios.head('https://video.oneloveipfs.com/ipfs/' + hashes[user][hashtype][h])
            hashSizes[hashes[user][hashtype][h]] = Number(res.headers['content-length'])
            console.log('Migrated',hashes[user][hashtype][h],Number(res.headers['content-length']))
        } catch (e) {
            console.log('Errored',hashes[user][hashtype][h],e)
        }
    }
    cb()
}

migrate(() => {
    fs.writeFileSync('db/hashsizes.json',JSON.stringify(hashSizes))
    fs.mkdirSync(require('os').homedir()+'/.oneloveipfs')
    fs.renameSync('db',require('os').homedir()+'/.oneloveipfs/db')
    // THEN RENAME SHAWP DB FILES AS FOLLOWS:
    // db/shawp/consumes.json -> db/shawpConsumes.json
    // db/shawp/refills.json -> db/shawpRefills.json
    // db/shawp/users.json -> db/shawpUsers.json
})