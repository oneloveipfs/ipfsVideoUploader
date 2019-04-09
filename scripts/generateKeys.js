const Steem = require('steem')
const fs = require('fs')

let auth = {
    wifMessage: Steem.auth.getPrivateKeys('randomvlogs',Steem.formatter.createSuggestedPassword(),['Posting']).Posting,
    AESKey: Steem.formatter.createSuggestedPassword(),
    JWTKey: Steem.formatter.createSuggestedPassword()
}

fs.writeFileSync(__dirname + '/../.auth.json',JSON.stringify(auth))