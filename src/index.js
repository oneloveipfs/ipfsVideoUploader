const Config = require('./config')
const FileUploader = require('./ipfsUploadHandler')
const encoderHelper = require('./encoderHelpers')
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

// documentations
app.get('/privacy', (request,response) => loadWebpage(__dirname+'/../client/generated/privacy.html',response))
app.get('/terms', (request,response) => loadWebpage(__dirname+'/../client/generated/terms.html',response))
app.get('/faq', (request,response) => loadWebpage(__dirname+'/../client/generated/faq.html',response))

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

    let queryNetwork = request.query.network || 'all'

    if (Config.whitelistEnabled)
        if (!Auth.isInWhitelist(request.query.user,queryNetwork))
            return response.status(403).send({error: 'Uploader access denied!'})

    let isInAllWhitelists = Auth.isInWhitelist(request.query.user,'all')
    if (isInAllWhitelists)
        queryNetwork = 'all'
    if (Config.Shawp.Enabled && request.query.needscredits === 'true') {
        let daysRemaining = Shawp.getDaysRemaining(request.query.user,isInAllWhitelists ? 'all' : (request.query.network || 'dtc'))
        if (daysRemaining.days === 0 && daysRemaining.needs)
            return response.status(402).send({
                error: 'Insufficient hosting credits, needs additional ' + Math.ceil(daysRemaining.needs) + ' GBdays.',
                needs: Math.ceil(daysRemaining.needs)
            })
    }

    if (request.query.network === 'dtc') {
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
                return response.status(403).send({error: 'Uploader access denied!'})

        Auth.generateJWT(decoded[0],decoded[2],(err,token) => {
            if (err) return response.send({error: err})
            response.send({access_token: token, error: null})
        })
    })
})

app.post('/loginsig',(request,response) => {
    // Signature based auth
    Auth.verifyAuthSignature(request.body,(valid,error) => {
        if (!valid)
            return response.status(400).send({error: 'Could not verify signature and/or recent block info: '+error})
        let split = request.body.split(':')
        if (Config.whitelistEnabled && !Auth.isInWhitelist(split[0],split[2]))
            return response.status(403).send({error: 'Uploader access denied'})
        
        Auth.generateJWT(split[0],split[2],(err,token) => {
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

app.post('/uploadChunk',Parser.json({ verify: rawBodySaver }),Parser.urlencoded({ verify: rawBodySaver, extended: true }),Parser.raw({ verify: rawBodySaver, type: '*/*' }),async (request,response) => {
    if (Config.enforceIPFSOnline && await FileUploader.isIPFSOnline() === false) return response.status(503).send({error: 'IPFS daemon is offline'})
    Authenticate(request,response,true,(user,network) => FileUploader.uploadChunk(user,network,request,response))
})

app.post('/uploadVideoResumable',Parser.json({ verify: rawBodySaver }),Parser.urlencoded({ verify: rawBodySaver, extended: true }),Parser.raw({ verify: rawBodySaver, type: '*/*' }),(request,response) => {
    if (!request.body || !request.body.HTTPRequest || !request.body.HTTPRequest.Header)
        return response.status(400).send({ error: 'Bad request' })
    else if (!Array.isArray(request.body.HTTPRequest.Header.Authorization) || request.body.HTTPRequest.Header.Authorization.length === 0)
        return response.status(400).send({ error: 'Missing auth headers' })
    let authHeader = request.body.HTTPRequest.Header.Authorization[0].split(' ')
    if (authHeader.length < 2 || authHeader[0] !== 'Bearer')
        return response.status(400).send({ error: 'Auth header must be a bearer' })
    Auth.authenticateTus(authHeader[1],true,(e,user,network) => {
        if (e) return response.status(401).send({error: e})
        if (request.body.Upload.IsPartial)
            return response.status(200).send()

        switch (request.headers['hook-name']) {
            case "pre-create":
                // Upload type check
                if(!db.getPossibleTypes().includes(request.body.Upload.MetaData.type) && request.body.Upload.MetaData.type !== 'hlsencode') return response.status(400).send({error: 'Invalid upload type'})

                if (request.body.Upload.MetaData.type === 'hlsencode') {
                    let fullusername = db.toFullUsername(user,network)
                    if (request.body.Upload.MetaData.selfEncode) {
                        if (!request.body.Upload.MetaData.encodeID || FileUploader.selfEncoderGet(fullusername).id !== request.body.Upload.MetaData.encodeID)
                            return response.status(401).send({error: 'Invalid self encode ID'})
                    } else {
                        if (!Config.admins.includes(fullusername) && !Config.Encoder.accounts.includes(fullusername) && !Config.admins.includes(user) && !Config.Encoder.accounts.includes(user))
                            return response.status(401).send({error: 'Uploads from encoding servers must be an admin or encoder account.'})

                        if (FileUploader.remoteEncoding(fullusername) !== request.body.Upload.MetaData.encodeID)
                            return response.status(401).send({error: 'Encoding upload ID currently not first in queue'})
                    }
                    if (isNaN(parseInt(request.body.Upload.MetaData.idx)) || parseInt(request.body.Upload.MetaData.idx) < -1)
                        return response.status(401).send({error: 'Invalid encoder output file index'})
                    if (isNaN(parseInt(request.body.Upload.MetaData.output)) && request.body.Upload.MetaData.output !== 'sprite')
                        return response.status(401).send({error: 'Invalid encoder output'})
                }
                return response.status(200).send()
            case "post-finish":
                request.socket.setTimeout(0)

                // Get user by access token then process upload
                FileUploader.handleTusUpload(request.body,user,network,() => {
                    if (request.body.Upload.MetaData.type !== 'hlsencode')
                        FileUploader.writeUploadRegister()
                    FileUploader.pruneTusPartialUploads(request.body.Upload.PartialUploads)
                    response.status(200).send()
                })
                break
            default:
                response.status(200).send()
                break
        }
    })
    // console.log(request.headers['hook-name'],request.body.Upload)
})

app.post('/spk/pin',Parser.json({ verify: rawBodySaver }),(req,res) => {
    Authenticate(req,res,true,(user,network) => {
        if (req.body.type !== 'hls' && req.body.type !== 'thumbnails')
            return res.status(401).send({error: 'type must be hls or thumbnails'})
        FileUploader.pinFromSPKNodes(user,network,req.body.hash,req.body.type,(err,id) => {
            if (err)
                res.status(500).send({error: err})
            else
                res.send({id: id})
        })
    })
})

app.get('/spk/pin/statuses',(req,res) => {
    res.send(FileUploader.spkPinRegister())
})

app.get('/spk/pin/status',(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        res.send(FileUploader.spkPinsRegisterByUser(user,network))
    })
})

app.get('/spk/pin/status/:id',(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        let result = FileUploader.spkPinsRegisterByUserAndID(user,network,req.params.id)
        if (!result)
            return res.status(404).send({error: 'pin request not found'})
        else
            res.send(result)
    })
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
        count: db.getHashes('videos').videos.length + db.getHashes('hls').hls.length,
        streams: db.getHashes('streams').streams.length,
        usercount: db.allUsersCount(),
        usage: db.getAllUsage()
    })
})

app.get('/encoder/config',(req,res) => {
    res.send({
        accounts: Config.Encoder.accounts,
        encoder: Config.Encoder.encoder,
        quality: Config.Encoder.quality,
        outputs: Config.Encoder.outputs
    })
})

app.get('/encoder/stats',(req,res) => {
    let queueIds = []
    for (let j in FileUploader.encoderQueue.queue)
        queueIds.push(FileUploader.encoderQueue.queue[j].id)
    res.send({
        queue: queueIds,
        processing: FileUploader.encoderQueue.processing
    })
})

app.post('/encoder/self/register',(req,res) => {
    Authenticate(req,res,true,(user,network) => {
        if (!req.query.outputs)
            return res.status(401).send({ error: 'comma-separated output resolutions are required' })
        let outputs = req.query.outputs.split(',')
        for (let i in outputs)
            if (!encoderHelper.getHlsBw(outputs[i]))
                return res.status(401).send({ error: 'invalid output '+outputs[i] })
        let duration = parseFloat(req.query.duration)
        if (isNaN(duration) || duration <= 0)
            return res.status(401).send({ error: 'invalid duration' })
        return res.send({id: FileUploader.selfEncoderRegister(db.toFullUsername(user,network),outputs,duration)})
    })
})

app.delete('/encoder/self/deregister',(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        FileUploader.selfEncoderDeregister(db.toFullUsername(user,network))
        return res.send({success: true})
    })
})

app.get('/encoder/self/get',(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        return res.send(FileUploader.selfEncoderGet(db.toFullUsername(user,network)))
    })
})

app.get('/encoder/self/all',(req,res) => {
    return res.send(FileUploader.selfEncoderGetAll())
})

app.post('/encoder/self/complete',(req,res) => {
    Authenticate(req,res,false,(user,network) => {
        FileUploader.selfEncoderComplete(user,network)
        return res.send({success: true})
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
        let hashInfo = db.getHashInfo(hashes[typerequested][i])
        result.push({
            cid: hashes[typerequested][i],
            size: hashInfo.size,
            ts: hashInfo.ts
        })
    }
    response.send(result)
})

app.get('/config',(req,res) => {
    let configRes = {}
    for (let c in Config.ClientConfig)
        configRes[c] = Config.ClientConfig[c]
    if (Config.Olisc.enabled)
        configRes.olisc = {
            apiNamespace: Config.Olisc.apiNamespace,
            runInterval: Config.Olisc.runInterval
        }
    configRes.skynetEnabled = Config.Skynet.enabled
    configRes.encoder = {
        accounts: Config.Encoder.accounts,
        encoder: Config.Encoder.encoder,
        quality: Config.Encoder.quality,
        outputs: Config.Encoder.outputs,
        maxSizeMb: Config.Encoder.maxSizeMb
    }
    res.send(configRes)
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
        hive: Shawp.hiveStreamer.headBlock,
        blurt: Shawp.blurtStreamer.headBlock
    })
})

app.get('/shawp_refill_admin',(req,res) => {
    if (!Config.Shawp.Enabled) return res.status(404).end()
    Authenticate(req,res,false,(user) => {
        if (!Config.admins.includes(user)) return res.status(403).send({error:'Not an admin'})
        let network = req.query.network
        let supportedNetworks = [Shawp.methods.DTUBE,Shawp.methods.Hive]
        if (!network || isNaN(parseInt(network)) || !supportedNetworks.includes(parseInt(network)))
            return res.status(400).send({error:'Invalid network'})
        Shawp.FetchTx(req.query.id,parseInt(req.query.network),(e,tx) => {
            if (e) return res.status(500).send({error:e})
            switch (parseInt(req.query.network)) {
                case Shawp.methods.DTUBE:
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
        } else Auth.verifyAuthSignature(req.body.aliasKey,(success,error) => {
            if (!success)
                return res.status(400).send({error: error})
            let decoded = req.body.aliasKey.split(':')
            if (decoded[2] === 'all')
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

const route404 = () => app.use((req,res) => { return res.status(404).redirect('/404') })

if (Config.Olisc.enabled) {
    const olisc = require('olisc')
    const oliscAuthFunc = (req) => {
        return new Promise((rs) => {
            if (req.route.path === Config.Olisc.apiNamespace+'/')
                return rs({})
            if (req.query.scauth === 'true')
                // Handle HiveSigner access token
                Auth.scAuth(req.query.access_token,false,(err,user,network) => err ? rs({error: err}) : rs({user: user, network: network}))
            else
                // Handle access token from /logincb
                Auth.verifyAuth(req.query.access_token,false,(e,result) => {
                    if (e) return rs({ error: e })
                    if (result.network === 'dtc')
                        result.network = 'avalon'
                    rs(result)
                })
        })
    }
    olisc.init(app,Config.Olisc,null,oliscAuthFunc).finally(route404)
} else
    route404()

http.listen(Config.HTTP_PORT,Config.HTTP_BIND_IP)