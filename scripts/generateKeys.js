const Steem = require('steem')
const Avalon = require('javalon')
const bcrypt = require('bcrypt')
const fs = require('fs')
const currentConfig = require('../.auth.json')

currentConfig.wifMessage = Steem.auth.getPrivateKeys('randomvlogs',Steem.formatter.createSuggestedPassword(),['Posting']).Posting
currentConfig.AESKey = Steem.formatter.createSuggestedPassword()
currentConfig.JWTKey = Steem.formatter.createSuggestedPassword()
currentConfig.wifAvalonMessage = Avalon.keypair().priv

// Custom webhook token
let webhooktoken = Steem.formatter.createSuggestedPassword()
console.log('Custom webhook token: ' + webhooktoken)

let webhookhash = bcrypt.hashSync(webhooktoken,10)
currentConfig.customwebhooktoken = webhookhash

fs.writeFileSync(__dirname + '/../.auth.json',JSON.stringify(currentConfig,null,4))