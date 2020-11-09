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
})