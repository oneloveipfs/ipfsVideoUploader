const Config = require('./config')
const FileUploader = require('./ipfsUploadHandler')
const db = require('./dbManager')
const Auth = require('./authManager')
const Shawp = require('./shawp')
const fs = require('fs')
const Express = require('express')
const Parser = require('body-parser')
const CORS = require('cors')
const app = Express()
const http = require('http').Server(app)

FileUploader.IPSync.init(http)
Shawp.init()
Auth.loadKeys()
Auth.watch()

// Prohibit access to certain files through HTTP
app.get('/src/*',(req,res) => {return res.status(404).redirect('/404')})
app.get('/test/*',(req,res) => {return res.status(404).redirect('/404')})
app.get('/config.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package-lock.json',(req,res) => {return res.status(404).redirect('/404')})

app.use(Express.static(__dirname+'/..', { dotfiles: 'deny' }));
app.use(CORS())

// body parser
const rawBodySaver = (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
}

app.use(Parser.text())

app.get('/', (request,response) => loadWebpage(__dirname+'/../client/welcome.html',response)) // Home page
app.get('/upload', (request,response) => loadWebpage(__dirname+'/../client/uploader.html',response)) // Upload page
app.get('/404', (request,response) => loadWebpage(__dirname+'/../client/404.html',response)) // 404 page
app.get('/hivesigner', (request,response) => loadWebpage(__dirname+'/../client/hivesigner.html',response)) // HiveSigner callback

app.get('/checkuser',(request,response) => {
    // Check if user is in whitelist
    if (!Config.whitelistEnabled)
        response.send({
            isInWhitelist: true,
            isAdmin: Config.admins.includes(request.query.user)
        })
    else
        response.send({
            isInWhitelist: Auth.isInWhitelist(request.query.user,request.query.network),
            isAdmin: Config.admins.includes(request.query.user)
        })
})

app.get('/login',(request,response) => {
    // Keychain Auth
    if (!request.query.user || request.query.user === '')
        // Username not specified, throw an error
        return response.status(400).send({error: 'Username not specified!'})

    let queryNetwork = request.query.network
    if (request.query.dtc == 'true') queryNetwork = 'dtc'

    if (Config.whitelistEnabled && !request.query.noauth)
        if (!Auth.isInWhitelist(request.query.user,queryNetwork))
            return response.status(403).send({error: 'Looks like you do not have access to the uploader!'})

    let isInAllWhitelists = Auth.isInWhitelist(request.query.user,'all')
    if (Config.Shawp.Enabled && request.query.needscredits == 'true') {
        let daysRemaining = Shawp.getDaysRemaining(request.query.user,isInAllWhitelists ? 'all' : (request.query.network || 'dtc'))
        if (daysRemaining.days === 0 && daysRemaining.needs)
            return response.status(402).send({
                error: 'Insufficient hosting credits, needs additional ' + Math.ceil(daysRemaining.needs) + ' GBdays.',
                needs: Math.ceil(daysRemaining.needs)
            })
    }

    if (request.query.dtc == 'true' || request.query.network == 'dtc') {
        Auth.generateEncryptedMemoAvalon(request.query.user,request.query.dtckeyid,(e,memo) => {
            if (e) return response.send(e)
            response.send({encrypted_memo: memo, error: null})
        })
    } else Auth.generateEncryptedMemo(request.query.user,(err,memo) => {
        if (err) return response.send({error: err})
        response.send({encrypted_memo: memo, error: null})
    })
})

app.post('/logincb',(request,response) => {
    // Keychain Auth Callback
    Auth.decryptMessage(request.body,(decoded) => {
        if (decoded === false)
            return response.status(400).send({error: 'Could not decipher message'})
        if (Config.whitelistEnabled)
            if (!Auth.isInWhitelist(decoded[0],decoded[2]))
                return response.status(403).send({error: 'Looks like you do not have access to the uploader!'})

        Auth.generateJWT(decoded[0],decoded[2],(err,token) => {
            if (err) return response.send({error: err})
            response.send({access_token: token, error: null})
        })
    })
})

app.get('/auth',(request,response) => {
    let access_token = request.query.access_token
    Auth.verifyAuth(access_token,false,(err,res) => {
        if (err) return response.status(401).send({error: err})
        else return response.send(res)
    })
})

app.post('/uploadVideo',(request,response) => {
    response.status(410).send({error: 'Non-resumable video upload API is depreciated. Please use Tus resumable video uploads. For more info, please refer to ResumableUploads.md in documentation.'})
})

app.post('/uploadVideoFs',Parser.json(),async (request,response) => {
    if (!Config.ClientConfig.uploadFromFs) return response.status(404).send({error: 'Uploading from local filesystem is not activated. Please enable it in config.json or use Tus resumable uploads.'})
    if (!request.body.type || !db.getPossibleTypes().includes(request.body.type)) return response.status(400).send('Invalid upload type')
    if (!fs.existsSync(request.body.filepath)) return response.status(400).send({error: 'File not found in filesystem'})
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => {
        let randomID = FileUploader.IPSync.randomID()
        FileUploader.uploadFromFs(request.body.type,request.body.filepath,randomID,user,network,request.body.skynet,() => FileUploader.writeUploadRegister())
        response.status(200).send({id: randomID})
    })
})

app.post('/uploadImage',async (request,response) => {
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => FileUploader.uploadImage(user,network,request,response))
})

app.post('/uploadSubtitle',async (request,response) => {
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => FileUploader.uploadSubtitles(user,network,request,response))
})

app.post('/uploadStream',async (request,response) => {
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => FileUploader.uploadStream(user,network,request,response))
})

app.post('/uploadChunk',async (request,response) => {
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => FileUploader.uploadChunk(user,network,request,response))
})

app.post('/uploadVideoResumable',Parser.json({ verify: rawBodySaver }),Parser.urlencoded({ verify: rawBodySaver, extended: true }),Parser.raw({ verify: rawBodySaver, type: '*/*' }),(request,response) => {
    if (!request.body.Upload.IsFinal)
        return response.status(200).send()
    // console.log(request.headers['hook-name'],request.body.Upload)
    switch (request.headers['hook-name']) {
        case "pre-create":
            // Upload type check
            if(!db.getPossibleTypes().includes(request.body.Upload.MetaData.type)) return response.status(400).send({error: 'Invalid upload type'})

            // Authenticate
            Auth.authenticate(request.body.Upload.MetaData.access_token,request.body.Upload.MetaData.keychain,true,(e,user) => {
                if (e) return response.status(401).send({error: e})
                if (request.body.Upload.MetaData.encoderUser && request.body.Upload.MetaData.encodingCost) { 
                    if (Auth.invalidHiveUsername(request.body.Upload.MetaData.encoderUser))
                        return response.status(401).send({error: 'Invalid encoderUser Hive username'})
                    else if (!Config.admins.includes(user) && !Config.encoderAccounts.includes(user))
                        return response.status(401).send({error: 'Uploads from encoding servers must be an admin or encoder account.'})
                    else if (request.body.Upload.MetaData.type == 'videos')
                        return response.status(401).send({error: 'Uploads from encoding servers may not be source video files.'})
                }
                return response.status(200).send()
            })
            break
        case "post-finish":
            request.socket.setTimeout(0)

            // Get user by access token then process upload
            Auth.authenticate(request.body.Upload.MetaData.access_token,request.body.Upload.MetaData.keychain,false,(e,user,network) => {
                let uploadUser = user
                if (request.body.Upload.MetaData.encoderUser && request.body.Upload.MetaData.encodingCost)
                    uploadUser = request.body.Upload.MetaData.encoderUser
                FileUploader.handleTusUpload(request.body,uploadUser,network,() => {
                    FileUploader.writeUploadRegister()
                    response.status(200).send()
                })
            })
            break
        default:
            response.status(200).send()
            break
    }
})

app.get('/usage',(request,response) => {
    // API to get usage info
    if (!request.query.user || request.query.user === '') return response.send('Username is not defined!');
    let usage = db.getUsage(request.query.user,request.query.network)
    response.send(usage)
})

// Get everyone's usage. Admin only API
app.get('/allusage',(request,response) => {
    if (!Config.Shawp.Enabled) response.status(404).send({ error: 'Shawp is not enabled' })
    Authenticate(request,response,false,(user) => {
        if (!Config.admins.includes(user)) return response.status(403).send({error:'Not an admin'})
        let allusage = {}
        let users = Shawp.AllUsers()
        for (let i = 0; i < users.length; i++)
            allusage[users[i]] = db.getUsage(db.toUsername(users[i]),db.toNetwork(users[i]))
        response.send(allusage)
    })
})

app.get('/stats',(request,response) => {
    response.send({
        count: db.getHashes('videos').videos.length,
        streams: db.getHashes('streams').streams.length,
        usercount: db.allUsersCount(),
        usage: db.getAllUsage()
    })
})

app.get('/hashes',(request,response) => {
    // API to get IPFS hashes of uploaded files
    let typerequested = request.query.hashtype
    if (typerequested === '' || !typerequested) {
        typerequested = db.getPossibleTypes()
    } else typerequested.split(',');

    if (!request.query.user || request.query.user === '')
        // Username not specified, return all hashes (either all videos, snaps or sprites, or all three)
        return response.send(db.getHashes(typerequested))
    else {
        let network = request.query.network
        if (Auth.isInWhitelist(request.query.user,null))
            network = 'all'
        let userExists = db.userExistInHashesDB(request.query.user,network)
        if (!userExists) return response.send({error: 'User specified doesn\'t exist in our record.'})
        else
            // BOTH valid username and hash type request are specified
            return response.send(db.getHashesByUser(typerequested,request.query.user,network))
    }
})

app.get('/pinsByType',(request,response) => {
    // API to get details of pins by tyle
    let typerequested = request.query.hashtype
    if (typerequested === '' || !typerequested)
        return response.status(400).send({error: 'Hash type not specified'})

    if (!db.getPossibleTypes().includes(typerequested))
        return response.status(400).send({error: 'Invalid hash type'})

    if (!request.query.user || request.query.user === '')
        // Username not specified, return all hashes (either all videos, snaps or sprites, or all three)
        return response.status(400).send({error: 'Username not specified'})
    let network = request.query.network
    if (Auth.isInWhitelist(request.query.user,null))
        network = 'all'
    let userExists = db.userExistInHashesDB(request.query.user,network)
    if (!userExists) return response.send({error: 'User specified doesn\'t exist in our record.'})

    // BOTH valid username and hash type request are specified
    let result = []
    let hashes = db.getHashesByUser(typerequested,request.query.user,network)
    if (!hashes[typerequested])
        return response.status(404).send({error: 'Hash type not found for user'})
    for (let i = 0; i < hashes[typerequested].length; i++) {
        result.push({
            cid: hashes[typerequested][i],
            size: db.getSizeByHash(hashes[typerequested][i])
        })
    }
    response.send(result)
})

app.get('/config',(req,res) => {
    res.send(Config.ClientConfig)
})

app.get('/activeusers',(req,res) => {
    res.send({count: FileUploader.IPSync.activeCount()})
})

app.get('/shawp_config',(req,res) => {
    res.send(Config.Shawp)
})

app.get('/shawp_head_blocks',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    res.send({
        avalon: Shawp.avalonStreamer.headBlock,
        hive: Shawp.hiveStreamer.headBlock
    })
})

app.get('/shawp_refill_admin',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user) => {
        if (!Config.admins.includes(user)) return res.status(403).send({error:'Not an admin'})
        let network = req.query.network
        let supportedNetworks = [Shawp.methods.DTC,Shawp.methods.Hive]
        if (!network || isNaN(parseInt(network)) || !supportedNetworks.includes(parseInt(network)))
            return res.status(400).send({error:'Invalid network'})
        Shawp.FetchTx(req.query.id,parseInt(req.query.network),(e,tx) => {
            if (e) return res.status(500).send({error:e})
            switch (parseInt(req.query.network)) {
                case Shawp.methods.DTC:
                    Shawp.ProcessAvalonTx(tx)
                    break
                case Shawp.methods.Hive:
                    Shawp.ProcessHiveTx(tx.operations[0].value,req.query.id)
                    break
                default:
                    break
            }
            return res.send({success: true})
        })
    })
})

app.get('/shawp_refill_history',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user,network) => {
        return res.send(Shawp.getRefillHistory(user,network,req.query.start || 0,req.query.count || 100))
    })
})

app.get('/shawp_refill_history_admin',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user) => {
        if (!Config.admins.includes(user)) return res.status(403).send({error:'Not an admin'})
        return res.send(Shawp.getRefillHistory(req.query.user,req.query.network || 'all',req.query.start || 0,req.query.count || 100))
    })
})

app.get('/shawp_consumption_history',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user,network) => {
        return res.send(Shawp.getConsumeHistory(user,network,req.query.start || 0,req.query.count || 100))
    })
})

app.get('/shawp_consumption_history_admin',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user) => {
        if (!Config.admins.includes(user)) return res.status(403).send({error:'Not an admin'})
        return res.send(Shawp.getConsumeHistory(req.query.user,req.query.network || 'all',req.query.start || 0,req.query.count || 100))
    })
})

app.get('/shawp_user_info',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user,network) => {
        let shawpuserdetail = Shawp.User(user,network)
        let aliasOf = db.getAliasOf(user,network)
        if (aliasOf) {
            shawpuserdetail.aliasUser = db.toUsername(aliasOf)
            shawpuserdetail.aliasNetwork = db.toNetwork(aliasOf)
        } else shawpuserdetail.aliasedUsers = db.getAliasedUsers(user,network)
        res.send(shawpuserdetail)
    })
})

app.get('/shawp_user_info_admin',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user,network) => {
        if (!Config.admins.includes(db.toFullUsername(user,network)))
            return res.status(403).send({error:'Not an admin'})
        else
            return res.send(Shawp.User(req.query.user,req.query.network || 'all'))
    })
})

app.get('/proxy_server',(req,res) => res.send({server: ''}))
app.get('/latest_build',(req,res) => res.send(Config.Build))

app.get('/user_info',(req,res) => {
    Authenticate(req,res,false,(user,network) => res.send(db.getUserInfo(user,network)))
})

app.put('/update_settings',Parser.json(),(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        // Validators
        for (i in req.body) {
            if (!db.settingsValidator[i])
                return res.status(400).send({error: 'invalid key ' + i})
            let validator = db.settingsValidator[i](req.body[i])
            if (validator !== null)
                return res.status(400).send({error: validator})
        }
        // Updators
        for (let i in req.body)
            db.settingsUpdate(user,network,i,req.body[i])
        db.writeUserInfoData()
        res.send({})
    })
})

app.get('/get_alias',(req,res) => {
    Authenticate(req,res,false,(mainUser,mainNetwork) => res.send(db.getAliasedUsers(mainUser,mainNetwork)))
})

app.put('/update_alias',Parser.json(),(req,res) => {
    // Access token should belong to the main account
    Authenticate(req,res,false,(mainUser,mainNetwork) => {
        if (!req.body.operation)
            return res.status(400).send({error: 'Missing operation'})
        if (req.body.operation !== 'set' && req.body.operation !== 'unset')
            return res.status(400).send({error: 'Invalid operation'})
        if (req.body.operation === 'set' && !req.body.aliasKey)
            return res.status(400).send({error: 'Missing alias account auth key'})
        if (req.body.operation === 'unset' && (!req.body.targetUser || !req.body.targetNetwork))
            return res.status(400).send({error: 'Missing target user or network'})
        else if (req.body.operation === 'unset') {
            try {
                if (db.toFullUsername(mainUser,mainNetwork) === db.toFullUsername(req.body.targetUser,req.body.targetNetwork))
                    throw `Cannot ${req.body.operation} user alias to itself`
                db.unsetUserAlias(mainUser,mainNetwork,req.body.targetUser,req.body.targetNetwork)
                Auth.whitelistRm(req.body.targetUser,req.body.targetNetwork)
                db.writeUserInfoData()
            } catch (e) {
                return res.status(400).send({error: e})
            }
            return res.send({})
        } else Auth.decryptMessage(req.body.aliasKey,(decoded) => {
            if (decoded === false)
                return res.status(400).send({error: 'Could not decipher alias key'})
            else if (decoded[2] === 'all')
                // all network type is disabled due to a security issue where only hive keys are verified
                return res.status(400).send({error: 'network type "all" is disabled'})
            try {
                if (db.toFullUsername(mainUser,mainNetwork) === db.toFullUsername(decoded[0],decoded[2]))
                    throw `Cannot ${req.body.operation} user alias to itself`
                db.setUserAlias(mainUser,mainNetwork,decoded[0],decoded[2])
                Auth.whitelistAdd(decoded[0],decoded[2],()=>{})
                db.writeUserInfoData()
            } catch (e) {
                return res.status(400).send({error: e})
            }
            res.send({})
        })
    })
})

function loadWebpage(HTMLFile,response) {
    fs.readFile(HTMLFile,function(error, data) {
        if (error) {
            response.writeHead(404);
            response.write(error.toString())
            response.end();
        } else {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(data);
            response.end();
        }
    });
}

function Authenticate(request,response,needscredits,next) {
    let access_token = request.query.access_token
    if (Config.whitelistEnabled && !access_token) return response.status(400).send({error: 'Missing API auth credentials'})
    if (request.query.scauth === 'true') {
        // Handle HiveSigner access token
        Auth.scAuth(access_token,needscredits,(err,user,network) => {
            if (err) return response.status(401).send({ error: err })
            else next(user,network)
        })
    } else {
        // Handle access token from /logincb
        Auth.verifyAuth(access_token,needscredits,(err,result) => {
            if (err) return response.status(401).send({ error: err })
            else next(result.user,result.network)
        })
    }
}

app.use((req,res) => { return res.status(404).redirect('/404') })

http.listen(Config.HTTP_PORT,Config.HTTP_BIND_IP)