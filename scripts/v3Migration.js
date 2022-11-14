const fs = require('fs')
const hashSizes = require('/Users/techcoderx/.oneloveipfs/db/hashsizes.json')
let hashInfo = {}

// try to trace back when those uploads were made from blockchain data
const NEW_TIMESTAMP = 0

for (let h in hashSizes)
    hashInfo[h] = {
        size: hashSizes[h],
        ts: NEW_TIMESTAMP
    }

fs.writeFileSync('/Users/techcoderx/.oneloveipfs/db/hashInfo.json',JSON.stringify(hashInfo))