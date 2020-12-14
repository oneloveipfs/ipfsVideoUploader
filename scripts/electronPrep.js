const fs = require('fs')

let electronJs = fs.readFileSync(process.cwd()+'/src/electronApp.js',{encoding: 'utf8'}).toString()

if (process.env.REMOTE_APP == '1') {
    electronJs = electronJs.replace("require('./index')","require('./remoteAppUser')")
    electronJs = electronJs.replace("const REMOTE_APP = 0","const REMOTE_APP = 1")
} else {
    electronJs = electronJs.replace("require('./remoteAppUser')","require('./index')")
    electronJs = electronJs.replace("const REMOTE_APP = 1","const REMOTE_APP = 0")
}

fs.writeFileSync(process.cwd()+'/src/electronApp.js',electronJs,'utf8')