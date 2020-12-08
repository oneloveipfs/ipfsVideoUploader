const fs = require('fs')

let electronJs = fs.readFileSync(process.cwd()+'/electron.js',{encoding: 'utf8'}).toString()

if (process.env.REMOTE_APP == '1')
    electronJs = electronJs.replace("require('./index')","require('./remoteAppUser')")
else
    electronJs = electronJs.replace("require('./remoteAppUser')","require('./index')")

fs.writeFileSync(process.cwd()+'/electron.js',electronJs,'utf8')