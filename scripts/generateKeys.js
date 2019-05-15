const Steem = require('steem')
const fs = require('fs')
const currentConfig = require('../.auth.json')

currentConfig.wifMessage = Steem.auth.getPrivateKeys('randomvlogs',Steem.formatter.createSuggestedPassword(),['Posting']).Posting
currentConfig.AESKey = Steem.formatter.createSuggestedPassword()
currentConfig.JWTKey = Steem.formatter.createSuggestedPassword()

fs.writeFileSync(__dirname + '/../.auth.json',JSON.stringify(currentConfig,null,4))