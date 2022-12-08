const Multer = require('multer')
const IPFS = require('ipfs-http-client')
// const Skynet = require('@nebulous/skynet')
const Shell = require('shelljs')
const FormData = require('form-data')
const axios = require('axios')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const async = require('async')
const WebVTT = require('node-webvtt')
const Socket = require('socket.io')
const Config = require('./config')
const db = require('./dbManager')
const Auth = require('./authManager')
const ProcessingQueue = require('./processingQueue')
const helpers = require('./encoderHelpers')
const spk = require('./spk')
const globSource = IPFS.globSource
const defaultDir = process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs'

let SocketIO, ipsync, uplstatusio, encoderdio
let usercount = 0

db.setupDb('register')

ffmpeg.setFfmpegPath(Config.Encoder.ffmpegPath ? Config.Encoder.ffmpegPath : Shell.which('ffmpeg').toString())
ffmpeg.setFfprobePath(Config.Encoder.ffprobePath ? Config.Encoder.ffprobePath : Shell.which('ffprobe').toString())

const encoderQueue = new ProcessingQueue()
const supportedEncoders = [
    'libx264',
    'h264_videotoolbox',
    'h264_nvenc',
    'h264_qsv',
    'h264_amf',
    'h264_vaapi',
    'h264_omx'
]
const MB = 1048576

let uploadRegister = JSON.parse(fs.readFileSync(defaultDir+'/db/register.json','utf8'))
let socketRegister = {}
let encoderRegister = {}
let spkPinsRegister = {}
let selfEncoderMap = {}

// spk pins timeouts
const SPK_PIN_REGISTER_TIMEOUT_RESULTED_HRS = 6
const SPK_PIN_REGISTER_TIMEOUT_RUNNING_HRS = 3

const emitToUID = (id,evt,message,updateTs) => {
    if (socketRegister[id] && socketRegister[id].socket) {
        if (updateTs)
            socketRegister[id].ts = new Date().getTime()
        socketRegister[id].socket.emit(evt,message)
    }
}

const remoteEncoderNext = (encoder) => {
    if (!encoderRegister[encoder]) return
    encoderRegister[encoder].queue.shift()
    delete encoderRegister[encoder].step
    delete encoderRegister[encoder].outputs
    if (encoderRegister[encoder].queue.length >= 1) {
        encoderRegister[encoder].socket.emit('job',encoderRegister[encoder].queue[0])
    }
}

const getEncoderBySocket = (socket) => {
    for (let r in encoderRegister)
        if (encoderRegister[r].socket && encoderRegister[r].socket.id === socket.id)
            return r
    return null
}

const ipfsAPI = IPFS.create({ host: 'localhost', port: Config.IPFS_API_PORT, protocol: 'http' })
const streamUpload = Multer({ dest: defaultDir, limits: { fileSize: 52428800 } }) // 50MB segments
const imgUpload = Multer({ dest: defaultDir, limits: { fileSize: 7340032 } })

const addFile = async (dir,trickle,skynetpin,callback,onlyHash) => {
    let opts = { trickle: trickle, cidVersion: 0 }
    if (onlyHash) opts.onlyHash = true
    let readableStream = fs.createReadStream(dir)
    let ipfsAdd = await ipfsAPI.add(readableStream, opts)
    let hash = ipfsAdd.cid.toString()
    let size = ipfsAdd.size

    if (skynetpin) {
        try {
            let skylink = await skynetAdd(dir,{
                portalUrl: Config.Skynet.portalUrl,
                portalUploadPath: Config.Skynet.portalUploadPath,
                portalFileFieldname: Config.Skynet.portalFileFieldname,
                customFilename: hash + '.mp4'
            })
            console.log('Added',size,hash,skylink)
            callback(size,hash,skylink)
        } catch (e) {
            console.log('Skynet upload error',e.response.data)
            console.log('Added',size,hash)
            callback(size,hash)
        }
    } else {
        console.log('Added',size,hash)
        callback(size,hash)
    }
}

const skynetAdd = (path,opts) => {
    let formData = new FormData()
    formData.append(opts.portalFileFieldname, fs.createReadStream(path))

    let url = trimTrailingSlash(opts.portalUrl) + trimTrailingSlash(opts.portalUploadPath) + '/' + opts.customFilename + '?filename=' + opts.customFilename + '&force=true'

    return new Promise((resolve, reject) => {
        axios.post(url, formData, { 
            headers: { 
                'User-Agent': 'Sia-Agent', 
                'content-type': formData.getHeaders()['content-type'],
                'Skynet-Api-Key': Config.Skynet.apiKey
            },
            maxContentLength: 99999999999,
            maxBodyLength: 99999999999
        })
            .then(resp => resolve(resp.data.skylink))
            .catch(error => reject(error))
    })
}

const addSprite = async (filepath,id) => {
    return new Promise((rs,rj) => {
        if (!Config.spritesEnabled) return rs({})
        Shell.exec(__dirname+'/../scripts/dtube-sprite.sh ' + filepath + ' ' + defaultDir + '/' + id + '.jpg',() => {
            addFile(defaultDir+'/'+id + '.jpg',true,false,(size,hash) => rs({size: size, hash: hash}))
        })
    })
}

const trimTrailingSlash = (str) => {
    return str.replace(/\/$/, "");
}

const processSingleVideo = async (id,user,network,cb) => {
    let vpath = Config.tusdUploadDir + '/' + id
    if (!fs.existsSync(vpath)) return cb({ error: 'Could not find upload' })
    let spriteGen = await addSprite(vpath,id)
    // Video hash and usage should already been handled previously
    db.recordHash(user,network,'sprites',spriteGen.hash,spriteGen.size)
    db.writeHashesData()
    db.writeHashInfoData()

    let result = {
        username: user,
        network: network,
        type: 'videos',
        ipfshash: uploadRegister[id].hash,
        spritehash: spriteGen.hash
    }

    if (Config.durationAPIEnabled)
        result.duration = await getDuration(vpath)

    uploadRegister[id] = result
    cb(result)
}

const getDuration = (path) => {
    return new Promise((rs,rj) => {
        ffmpeg.ffprobe(path,(e,i) => {
            if (e)
                rj(e)
            else rs(i.format.duration)
        })
    })
}

let uploadOps = {
    isIPFSOnline: async () => {
        try {
            for await (const i of ipfsAPI.stats.bw()) {}
        } catch {
            return false
        }
        return true
    },
    uploadImage: (username,network,request,response) => {
        let imgType = request.query.type
        if (!imgType) return response.status(400).send({error: 'Image upload type not specified!'})
        if (imgType != 'images' && imgType != 'thumbnails') return response.status(400).send({error: 'Invalid image upload type specified!'})
        let trickleDagAdd = false
        if (imgType === 'images')
            trickleDagAdd = true

        imgUpload.single('image')(request,response,(err) => {
            if (err) return response.status(400).send({error: err})
            if (!request.file) return response.status(400).send({error: 'No files have been uploaded.'})
            let uploadedImg = request.file.filename
            addFile(defaultDir+'/'+uploadedImg,trickleDagAdd,false,(size,hash) => {
                // Log IPFS hashes by account
                // If hash is not in database, add the hash into database
                if (!request.query.onlyhash) {
                    db.recordHash(username,network,imgType,hash,request.file.size)
                    db.writeHashesData()
                    db.writeHashInfoData()
                }

                // Send image IPFS hash back to client and IPSync
                let result = {
                    username: username,
                    network: network,
                    imghash: hash,
                    imgtype: imgType
                }
                // reference thumbnail filename for hls uploads
                if (imgType === 'thumbnails')
                    result.fsname = uploadedImg
                response.send(result)
                if (!request.query.onlyhash)
                    ipsync.emit('upload',result)
                if (Config.deleteUploadsAfterAdd && imgType !== 'thumbnails')
                    fs.unlink(defaultDir+'/'+uploadedImg,()=>{})
            },request.query.onlyhash)
        })
    },
    uploadSubtitles: async (username,network,request,response) => {
        try {
            WebVTT.parse(request.body)
        } catch (err) {
            return response.status(400).send({error: 'Subtitle error: ' + err})
        }

        let subtitleBuffer = new Buffer.from(request.body,'utf8')
        let sub = await ipfsAPI.add(subtitleBuffer)
        
        db.recordHash(username,network,'subtitles',sub.cid.toString(),sub.size)
        db.writeHashesData()
        db.writeHashInfoData()

        let result = {
            username: username,
            network: network,
            type: 'subtitles',
            hash: sub.cid.toString()
        }
        response.send(result)
        ipsync.emit('upload',result)
    },
    uploadStream: (username,network,request,response) => {
        // video/mp2t
        streamUpload.single('segment')(request,response,(err) => {
            if (err) return response.status(400).send({error: err})
            if (!request.body.streamId) return response.status(400).send({error: 'Missing streamId'})
            let segmentDir = request.file.path
            addFile(segmentDir,false,false,(size,hash) => {
                // We will finalize total stream size after livestream ends,
                // for now it does not count towards disk usage. Alive streams
                // record as network/streamer/link so that the full list of
                // hashes can be retrieved from the blockchain later.
                // TODO: Verify that network/streamer/link exists
                if (db.recordHash(username,network,'streams',request.body.streamId,0))
                    db.writeHashesData()

                let result = {
                    username: username,
                    network: network,
                    type: 'streams',
                    hash: hash
                }
                response.status(200).send(result)
                if (Config.deleteUploadsAfterAdd) fs.unlink(segmentDir,()=>{})
            })
        })
    },
    uploadChunk: async (username,network,request,response) => {
        if (!request.body || !request.body.content)
            return response.status(400).send({error: 'missing chunk content'})
        let chunkBuf = Buffer.from(request.body.content,'utf8')
        let ipfsAdd = await ipfsAPI.add(chunkBuf)

        db.recordHash(username,network,'chunks',ipfsAdd.cid.toString(),ipfsAdd.size)
        db.writeHashesData()
        db.writeHashInfoData()

        let result = {
            username: username,
            network: network,
            type: 'chunks',
            hash: ipfsAdd.cid.toString()
        }
        response.send(result)
        ipsync.emit('upload',result)
    },
    encoderQueue,
    handleTusUpload: async (json,user,network,callback) => {
        let filepath = json.Upload.Storage.Path
        switch (json.Upload.MetaData.type) {
            case 'hlsencode':
                // create folders if not exist
                const workingDir = defaultDir+'/'+json.Upload.MetaData.encodeID
                if (!fs.existsSync(workingDir))
                    fs.mkdirSync(workingDir)
                if (json.Upload.MetaData.output !== 'sprite') {
                    if (!fs.existsSync(workingDir+'/'+json.Upload.MetaData.output+'p'))
                        fs.mkdirSync(workingDir+'/'+json.Upload.MetaData.output+'p')

                    // move files from tus dir to created folders
                    if (parseInt(json.Upload.MetaData.idx) >= 0 && !fs.existsSync(workingDir+'/'+json.Upload.MetaData.output+'p/'+json.Upload.MetaData.idx+'.ts'))
                        fs.renameSync(filepath,workingDir+'/'+json.Upload.MetaData.output+'p/'+json.Upload.MetaData.idx+'.ts')
                    else if (parseInt(json.Upload.MetaData.idx) === -1 && !fs.existsSync(workingDir+'/'+json.Upload.MetaData.output+'p/index.m3u8'))
                        // index m3u8 file
                        fs.renameSync(filepath,workingDir+'/'+json.Upload.MetaData.output+'p/index.m3u8')
                    else
                        // error if duplicate output uploads
                        if (!json.Upload.MetaData.selfEncode && encoderRegister[db.toFullUsername(user,network)] && encoderRegister[db.toFullUsername(user,network)].socket) {
                            fs.unlinkSync(filepath)
                            encoderRegister[db.toFullUsername(user,network)].socket.emit('error',{
                                method: 'hlsencode',
                                id: json.Upload.MetaData.encodeID,
                                error: 'duplicate output upload '+json.Upload.MetaData.output+'p idx '+json.Upload.MetaData.idx
                            })
                            return callback()
                        } else if (json.Upload.MetaData.selfEncode)
                            emitToUID(json.upload.MetaData.encodeID,'error',{ error: 'duplicate output upload '+json.Upload.MetaData.output+'p idx '+json.Upload.MetaData.idx })
                } else {
                    if (!fs.existsSync(workingDir+'/sprite.jpg'))
                        fs.renameSync(filepath,workingDir+'/sprite.jpg')
                    else
                        // error if duplicate sprite uploads
                        if (!json.Upload.MetaData.selfEncode && encoderRegister[db.toFullUsername(user,network)] && encoderRegister[db.toFullUsername(user,network)].socket) {
                            fs.unlinkSync(filepath)
                            encoderRegister[db.toFullUsername(user,network)].socket.emit('error',{
                                method: 'hlsencode',
                                id: json.Upload.MetaData.encodeID,
                                error: 'duplicate sprite upload'
                            })
                            return callback()
                        } else if (json.Upload.MetaData.selfEncode)
                            emitToUID(json.upload.MetaData.encodeID,'error',{ error: 'duplicate sprite upload' })
                }
                let ack = {
                    method: 'hlsencode',
                    id: json.Upload.MetaData.encodeID,
                    idx: json.Upload.MetaData.idx,
                    output: json.Upload.MetaData.output,
                    success: true
                }
                if (!json.Upload.MetaData.selfEncode && encoderRegister[db.toFullUsername(user,network)] && encoderRegister[db.toFullUsername(user,network)].socket)
                    encoderRegister[db.toFullUsername(user,network)].socket.emit('result',ack)
                else if (json.Upload.MetaData.selfEncode)
                    emitToUID(json.upload.MetaData.encodeID,'result',ack,true)
                callback()
                break
            case 'hls':
                helpers.getFFprobeVideo(filepath).then((d) => {
                    let { width, height, duration, orientation } = d
                    if (!width || !height || !duration || !orientation)
                        return emitToUID(json.Upload.ID,'error',{ error: 'could not retrieve ffprobe info on uploaded video' },false)

                    if (json.Upload.MetaData.encoder) {
                        if (!encoderRegister[json.Upload.MetaData.encoder])
                            return emitToUID(json.Upload.ID,'error',{ error: 'Encoder is not online' })
                        if (json.Upload.Size > encoderRegister[json.Upload.MetaData.encoder].maxSize)
                            return emitToUID(json.Upload.ID,'error',{ error: 'Uploaded file exceeds max size allowed by chosen encoder' })
                        uploadOps.remoteEncoderPushJob(json.Upload.MetaData.encoder,json.Upload.ID,user,network,duration,json.Upload.MetaData.createSprite,json.Upload.MetaData.thumbnailFname)
                        if (encoderRegister[json.Upload.MetaData.encoder].queue.length === 1)
                            encoderRegister[json.Upload.MetaData.encoder].socket.emit('job', remotejob)
                        return
                    }

                    if (Config.Encoder.outputs.length === 0)
                        return emitToUID(json.Upload.ID,'error',{ error: 'Server encoder is disabled' })
                    else if (Config.Encoder.maxSizeMb && json.Upload.Size > Config.Encoder.maxSizeMb*MB)
                        return emitToUID(json.Upload.ID,'error',{ error: 'Uploaded file exceeds max size allowed by server encoder' })

                    let outputResolutions = helpers.determineOutputs(width,height,Config.Encoder.outputs)

                    // Create folders
                    fs.mkdirSync(defaultDir+'/'+json.Upload.ID)
                    for (let r in outputResolutions)
                        fs.mkdirSync(defaultDir+'/'+json.Upload.ID+'/'+outputResolutions[r]+'p')
                    
                    // Encoding ops
                    const ops = helpers.hlsEncode(
                        json.Upload.ID,
                        filepath,
                        orientation,
                        Config.Encoder.encoder,
                        Config.Encoder.quality,
                        outputResolutions,
                        Config.spritesEnabled && json.Upload.MetaData.createSprite,
                        defaultDir+'/'+json.Upload.ID,
                        Config.Encoder.threads,
                        (id, resolution, p) => {
                            emitToUID(id,'progress',{
                                job: 'encode',
                                resolution: resolution,
                                frames: p.frames,
                                fps: p.currentFps,
                                progress: p.percent
                            },true)
                            console.log('ID '+id+' - '+resolution+'p --- Frames: '+p.frames+'   FPS: '+p.currentFps+'   Progress: '+p.percent.toFixed(3)+'%')
                        },
                        (id, resolution, e) => {
                            console.error(id+' - '+resolution+'p --- Error',e)
                            emitToUID(id,'error',{ error: resolution + 'p resolution encoding failed' },false)
                        })
                    encoderQueue.push({ id: json.Upload.ID, f: (s, nextJob) => {
                        s.step = 'encode'
                        s.outputs = outputResolutions
                        emitToUID(json.Upload.ID,'begin',s,true)
                        async.parallel(ops, async (e) => {
                            if (e)
                                return nextJob()

                            s.step = 'container'
                            delete s.outputs
                            emitToUID(json.Upload.ID,'begin',s,true)
                            
                            // Construct master playlist, thumbnail
                            let masterPlaylist = helpers.createMasterPlaylist(defaultDir+'/'+json.Upload.ID,outputResolutions)
                            if (!masterPlaylist.success) {
                                emitToUID(json.Upload.ID,'error',{ error: masterPlaylist.error },false)
                                return nextJob()
                            }
                            let hasThumbnail = helpers.hlsThumbnail(json.Upload.MetaData.thumbnailFname,defaultDir,defaultDir+'/'+json.Upload.ID)

                            s.step = 'ipfsadd'
                            emitToUID(json.Upload.ID,'begin',s,true)

                            // Add container to IPFS
                            // TODO: Add to Skynet whenever applicable
                            let folderhash, spritehash
                            let addProgress = {
                                progress: 0,
                                total: helpers.recursiveFileCount(defaultDir+'/'+json.Upload.ID) + 1
                            }
                            for await (const f of ipfsAPI.addAll(globSource(defaultDir,json.Upload.ID+'/**'),{cidVersion: 0, pin: true})) {
                                if (f.path.endsWith(json.Upload.ID))
                                    folderhash = f
                                else if (f.path.endsWith('sprite.jpg'))
                                    spritehash = f.cid.toString()
                                addProgress.progress += 1
                                emitToUID(json.Upload.ID,'progress',{
                                    job: 'ipfsadd',
                                    progress: addProgress.progress,
                                    total: addProgress.total
                                },true)
                            }
                            if (!folderhash || !folderhash.cid) {
                                emitToUID(json.Upload.ID,'error',{ error: 'HLS container IPFS add failed' },false)
                                return nextJob()
                            }

                            // Record in db and return result
                            db.recordHash(user,network,'hls',folderhash.cid.toString(),folderhash.size)
                            db.writeHashesData()
                            db.writeHashInfoData()

                            let result = {
                                username: user,
                                network: network,
                                type: 'hls',
                                ipfshash: folderhash.cid.toString(),
                                spritehash: spritehash,
                                size: folderhash.size,
                                duration: duration,
                                hasThumbnail: hasThumbnail,
                                resolutions: outputResolutions
                            }
                            console.log(result)
                            emitToUID(json.Upload.ID,'result',result,false)
                            delete socketRegister[json.Upload.ID]
                            uploadRegister[json.Upload.ID] = result
                            ipsync.emit('upload',result)
                            callback()
                            nextJob()
                        })
                    }, s: {}})
                }).catch(() => {
                    let error = {
                        username: user,
                        network: network,
                        type: 'hls',
                        error: 'could not obtain ffprobe video metadata, this is probably not a video'
                    }
                    uploadRegister[json.Upload.ID] = error
                    return emitToUID(json.Upload.ID,'error',error,false)
                })
                break
            case 'videos':
                try {
                    await helpers.getFFprobeVideo(filepath)
                } catch (e) {
                    if (socketRegister[json.Upload.ID] && socketRegister[json.Upload.ID].socket) socketRegister[json.Upload.ID].socket.emit('error',{error: 'Failed to parse video'})
                    delete socketRegister[json.Upload.ID]
                    callback()
                    return
                }
                let ipfsops = {
                    videohash: (cb) => {
                        addFile(filepath,true,Config.Skynet.enabled && json.Upload.MetaData.skynet == 'true',(size,hash,skylink) => cb(null,{ipfshash: hash, skylink: skylink, size: size}))
                    },
                    spritehash: (cb) => {
                        addSprite(filepath,json.Upload.ID).then(r=>cb(null,r))
                    }
                }

                async.parallel(ipfsops, async (errors,results) => {
                    if (errors) console.log(errors)
                    console.log(results)
                    db.recordHash(user,network,'videos',results.videohash.ipfshash,json.Upload.Size)
                    db.recordHash(user,network,'sprites',results.spritehash.hash,results.spritehash.size)
                    db.writeHashesData()
                    db.writeHashInfoData()

                    if (results.videohash.skylink) {
                        db.recordSkylink(user,network,'videos',results.videohash.skylink)
                        db.writeSkylinksData()
                    }

                    let result = {
                        username: user,
                        network: network,
                        type: 'videos',
                        ipfshash: results.videohash.ipfshash,
                        spritehash: results.spritehash.hash,
                        skylink: results.videohash.skylink,
                        filesize: json.Upload.Size
                    }

                    if (Config.durationAPIEnabled)
                        result.duration = await getDuration(filepath)

                    if (socketRegister[json.Upload.ID] && socketRegister[json.Upload.ID].socket) socketRegister[json.Upload.ID].socket.emit('result',result)
                    delete socketRegister[json.Upload.ID]
                    uploadRegister[json.Upload.ID] = result
                    ipsync.emit('upload',result)
                    callback()
                })
                break
            case 'video240':
            case 'video480':
            case 'video720':
            case 'video1080':
                try {
                    await helpers.getFFprobeVideo(filepath)
                } catch (e) {
                    if (socketRegister[json.Upload.ID] && socketRegister[json.Upload.ID].socket) socketRegister[json.Upload.ID].socket.emit('error',{error: 'Failed to parse video'})
                    delete socketRegister[json.Upload.ID]
                    callback()
                    return
                }
                addFile(filepath,true,Config.Skynet.enabled && json.Upload.MetaData.skynet == 'true',(size,hash,skylink) => {
                    db.recordHash(user,network,json.Upload.MetaData.type,hash,json.Upload.Size)
                    db.writeHashesData()
                    db.writeHashInfoData()

                    if (skylink) {
                        db.recordSkylink(user,network,json.Upload.MetaData.type,skylink)
                        db.writeSkylinksData()
                    }

                    // TODO: Record encoding cost reported by encoding servers

                    let result = { 
                        username: user,
                        network: network,
                        type: json.Upload.MetaData.type,
                        hash: hash,
                        skylink: skylink
                    }

                    if (socketRegister[json.Upload.ID] && socketRegister[json.Upload.ID].socket) socketRegister[json.Upload.ID].socket.emit('result',result)
                    delete socketRegister[json.Upload.ID]
                    uploadRegister[json.Upload.ID] = result
                    ipsync.emit('upload',result)
                    callback()
                })
                break
            default:
                callback()
                break
        }
    },
    uploadFromFs: (type,filepath,id,user,network,skynet,cb) => {
        let tusTypes = ['videos','video240','video480','video720','video1080','hls']
        fs.stat(filepath,(e,s) => {
            if (e) return console.log(e)
            if (tusTypes.includes(type)) uploadOps.handleTusUpload({
                Upload: {
                    ID: id,
                    Size: s.size,
                    Storage: { Path: filepath },
                    MetaData: { type: type, skynet: skynet }
                }
            },user,network,cb)
        })
    },
    pruneTusPartialUploads: (PartialUploads = []) => {
        if (!PartialUploads) return
        for (let i in PartialUploads) {
            if (fs.existsSync(Config.tusdUploadDir+'/'+PartialUploads[i]))
                fs.unlinkSync(Config.tusdUploadDir+'/'+PartialUploads[i])
            if (fs.existsSync(Config.tusdUploadDir+'/'+PartialUploads[i]+'.info'))
                fs.unlinkSync(Config.tusdUploadDir+'/'+PartialUploads[i]+'.info')
        }
    },
    pinFromSPKNodes: async (username,network,hash,type,cb) => {
        let statusCode = await spk.retrieveIPFS(hash)
        if (statusCode !== 200)
            return cb('Failed to retrieve file from 3speak nodes, status code: '+statusCode)
        let peerInterval = setInterval(async () => {
            for (let i in Config.PinService.SPKOrigins)
                try {
                    await ipfsAPI.swarm.connect(Config.PinService[i])
                } catch {}
        },5000)
        let pinOpId = db.toFullUsername(username,network)+':'+uploadOps.IPSync.randomID()
        spkPinsRegister[pinOpId] = {
            status: 0,
            ts: new Date().getTime(),
            hash: hash,
            type: type
        }
        cb(null,pinOpId)
        try {
            console.log('SPK pinned hash',await ipfsAPI.pin.add(hash))
            clearInterval(peerInterval)
        } catch (e) {
            spkPinsRegister[pinOpId].status = 2
            spkPinsRegister[pinOpId].msg = e.toString()
            spkPinsRegister[pinOpId].ts = new Date().getTime()
            clearInterval(peerInterval)
            return // handle ipfs pin add error
        }

        let size
        let dir = []
        try {
            let stat = await ipfsAPI.files.stat('/ipfs/'+hash)
            db.recordHash(username,network,type,hash,stat.cumulativeSize,'SPK')
            db.writeHashesData()
            db.writeHashInfoData()
            size = stat.cumulativeSize
            if (stat.type === 'directory')
                for await (const f of ipfsAPI.ls('/ipfs/'+hash))
                    dir.push(f)
        } catch (e) {
            console.log(e)
            spkPinsRegister[pinOpId].status = 3
            spkPinsRegister[pinOpId].msg = e.toString()
            spkPinsRegister[pinOpId].ts = new Date().getTime()
            return // handle ipfs file stat error
        }

        for (let i in dir)
            dir[i].cid = dir[i].cid.toString()

        let result = {
            username: username,
            network: network,
            type: type,
            hash: hash,
            dir: dir,
            size: size
        }
        spkPinsRegister[pinOpId].status = 1
        spkPinsRegister[pinOpId].ts = new Date().getTime()
        spkPinsRegister[pinOpId].hash = hash
        spkPinsRegister[pinOpId].dir = dir
        spkPinsRegister[pinOpId].size = size
        console.log('SPK pin',result)
        ipsync.emit('upload',result)
    },
    spkPinRegister: () => spkPinsRegister,
    spkPinsRegisterByUser: (user,network) => {
        let result = {}
        for (let i in spkPinsRegister)
            if (i.split(':')[0] === db.toFullUsername(user,network))
                result[i.split(':')[1]] = spkPinsRegister[i]
        return result
    },
    spkPinsRegisterByUserAndID: (user,network,id) => {
        return spkPinsRegister[db.toFullUsername(user,network)+':'+id]
    },
    writeUploadRegister: () => {
        fs.writeFile(defaultDir+'/db/register.json',JSON.stringify(uploadRegister),() => {})
    },
    remoteEncoding: (encoder) => {
        // Get first upload ID from remote encoder queue
        if (!encoderRegister[encoder] || !Array.isArray(encoderRegister[encoder].queue) || encoderRegister[encoder].queue.length === 0)
            return ''
        else
            return encoderRegister[encoder].queue[0].id
    },
    remoteEncoderStatus: () => {
        return Object.fromEntries(Object.keys(encoderRegister).map(key => [key, {
            lastAuth: encoderRegister[key].lastAuth,
            encoder: encoderRegister[key].encoder,
            quality: encoderRegister[key].quality,
            outputs: encoderRegister[key].outputs,
            maxSize: encoderRegister[key].maxSize,
            active: encoderRegister[key].socket ? true : false,
            queue: encoderRegister[key].queue.map(q => q.id),
            processing: uploadOps.remoteEncoding(key)
        }]))
    },
    remoteEncoderRegister: (encoderName,socket,encoder,quality,outputs,maxSize) => {
        if (!encoderRegister[encoderName])
            encoderRegister[encoderName] = {
                queue: []
            }
        encoderRegister[encoderName].socket = socket
        encoderRegister[encoderName].lastAuth = new Date().getTime()
        encoderRegister[encoderName].encoder = encoder
        encoderRegister[encoderName].quality = quality
        encoderRegister[encoderName].outputs = outputs
        encoderRegister[encoderName].maxSize = maxSize
    },
    remoteEncoderPushJob: (encoderName, id, username, network, duration, createSprite, thumbnailFname) => {
        encoderRegister[encoderName].queue.push({id,username,network,duration,createSprite,thumbnailFname})
    },
    selfEncoderGet: (fullUsername) => {
        return selfEncoderMap[fullUsername] || {}
    },
    selfEncoderRegister: (fullUsername,outputs,duration) => {
        if (selfEncoderMap[fullUsername] && selfEncoderMap[fullUsername].id && fs.existsSync(selfEncoderMap[fullUsername].id))
            fs.unlinkSync(defaultDir+'/'+selfEncoderMap[fullUsername].id)
        let randomID = uploadOps.IPSync.randomID()
        selfEncoderMap[fullUsername] = {
            id: randomID,
            ts: new Date().getTime(),
            duration: duration,
            outputs: outputs
        }
        fs.mkdirSync(defaultDir+'/'+randomID)
        return randomID
    },
    selfEncoderDeregister: (fullUsername) => {
        if (selfEncoderMap[fullUsername] && selfEncoderMap[fullUsername].id && fs.existsSync(selfEncoderMap[fullUsername].id))
            fs.unlinkSync(defaultDir+'/'+selfEncoderMap[fullUsername].id)
        delete selfEncoderMap[fullUsername]
    },
    selfEncoderComplete: async (user,network) => {
        let fullUsername = db.toFullUsername(user,network)
        let details = selfEncoderMap[fullUsername]
        delete selfEncoderMap[fullUsername]
        emitToUID(details.id,'begin',{ step: 'container' }, true)

        // Master playlist, thumbnail
        let masterPlaylist = await helpers.createMasterPlaylist(defaultDir+'/'+details.id,details.outputs)
        if (!masterPlaylist.success) {
            emitToUID(details.id,'error',{ error: masterPlaylist.error },false)
            return
        }

        // Add container to IPFS
        emitToUID(details.id,'begin',{ step: 'ipfsadd' },true)
        let ipfsaddop = await helpers.addHlsToIPFS(ipfsAPI,globSource,defaultDir,details.id,(addProgress) => {
            emitToUID(details.id,'progress',{
                job: 'ipfsadd',
                progress: addProgress.progress,
                total: addProgress.total
            },true)
        })
        if (ipfsaddop.error) {
            emitToUID(details.id,'error',{ error: ipfsaddop.error },false)
            return
        }

        // Record in db and return result
        db.recordHash(user,network,'hls',ipfsaddop.folderhash.cid.toString(),ipfsaddop.folderhash.size)
        db.writeHashesData()
        db.writeHashInfoData()

        let result = {
            username: user,
            network: network,
            type: 'hls',
            ipfshash: ipfsaddop.folderhash.cid.toString(),
            spritehash: ipfsaddop.spritehash,
            size: ipfsaddop.folderhash.size,
            duration: details.duration,
            hasThumbnail: false,
            resolutions: details.outputs,
            encoder: 'SELF'
        }
        console.log(result)
        emitToUID(details.id,'result',result,false)
        delete socketRegister[details.id]
        uploadRegister[details.id] = result
        ipsync.emit('upload',result)
    },
    IPSync: {
        init: (server) => {
            SocketIO = Socket(server, {
                cors: {
                    origin: '*',
                    methods: ['GET','POST']
                }
            })
            ipsync = SocketIO.of('/ipsync')

            ipsync.on('connection',(socket) => {
                socket.emit('message','Welcome to IPSync')
            })

            // Upload status socket.io endpoint
            uplstatusio = SocketIO.of('/uploadStat')

            // Monitor number of connected users
            uplstatusio.on('connection',(socket) => {
                usercount++
                socket.on('disconnect',() => {
                    usercount--

                    // Unregister socket from upload ID
                    for (upls in socketRegister) {
                        if (socketRegister[upls].socket == socket) {
                            delete socketRegister[upls]
                        }
                    }
                })
                
                // Register socket with upload ID
                socket.on('registerid',(info) => {
                    if (!info) return socket.emit('result',{ error: 'Missing upload info' })
                    if (typeof info !== 'object') return socket.emit('result', { error: 'Upload info must be a JSON object' })
                    if (!info.id) return socket.emit('result', { error: 'Missing upload ID' })
                    if (!info.type) return socket.emit('result', { error: 'Missing upload type' })
                    if (!info.access_token) return socket.emit('result', { error: 'Missing access token' })
                    if (!db.getPossibleTypes().includes(info.type)) return socket.emit('result', { error: 'Invalid upload type requested' })

                    // Authenticate & get username
                    Auth.authenticate(info.access_token,info.keychain,false,(e,user,network) => {
                        if (e) return socket.emit('error', { error: e })
                        
                        // Upload ID not found in register, register socket
                        if (!uploadRegister[info.id]) {
                            if (encoderQueue.processing === info.id)
                                socket.emit('begin', encoderQueue.s)
                            return socketRegister[info.id] = {
                                socket: socket,
                                ts: new Date().getTime()
                            }
                        }

                        // Upload ID exist in register and matches type requested, return result immediately
                        if (info.type === uploadRegister[info.id].type) {
                            if (uploadRegister[info.id].error)
                                return socket.emit('error',uploadRegister[info.id])
                            else
                                return socket.emit('result',uploadRegister[info.id])
                        }
                        
                        // Type requested does not match registered type
                        // HLS uploads do not transform into other upload types
                        if (info.type === 'hls' || info.type === 'hlsencode')
                            return socket.emit('error',{ error: 'hls uploads cannot be transformed' })

                        // Encoded video hash requested, return only hash
                        if (info.type !== 'videos') return socket.emit('result',{
                            username: uploadRegister[info.id].username,
                            type: info.type,
                            hash: uploadRegister[info.id].hash || uploadRegister[info.id].ipfshash
                        })

                        // Or else if "videos" type requested, generate sprites, duration etc
                        processSingleVideo(info.id,user,network,(result) => {
                            socket.emit('result',result)
                        })
                    })
                })
            })

            // Clear sockets from register after x minutes if results not returned
            setInterval(() => {
                let currentTime = new Date().getTime()
                for (ids in socketRegister) {
                    if (Math.abs(socketRegister[ids].ts - currentTime) > Config.socketTimeout) delete socketRegister[ids]
                }
            },60000)

            encoderdio = SocketIO.of('/encoderdaemon')

            encoderdio.on('connection',(socket) => {
                socket.emit('message','Remote encoder connected')

                socket.on('auth',(info) => {
                    if (!info) return socket.emit('error',{ method: 'auth', error: 'Missing authentication info' })
                    if (typeof info !== 'object') return socket.emit('error', { method: 'auth', error: 'Authentication info must be a JSON object' })
                    if (!info.access_token) return socket.emit('error', { method: 'auth', error: 'Missing access token' })
                    if (typeof info.encoder !== 'string') return socket.emit('error', { method: 'auth', error: 'Encoder must be specified. Valid values: '+supportedEncoders.join(', ') })
                    if (!supportedEncoders.includes(info.encoder)) return socket.emit('error', { method: 'auth', error: 'Invalid encoder' })
                    if (typeof info.quality !== 'string') return socket.emit('error', { method: 'auth', error: 'Quality (string) must be specified' })
                    if (!Array.isArray(info.outputs)) return socket.emit('error', { method: 'auth', error: 'Qutputs array must be specified. Valid array values: '+helpers.getHlsQList().join(', ') })
                    for (let o in info.outputs)
                        if (!helpers.getHlsBw(info.outputs[o]))
                            return socket.emit('error', { method: 'auth', error: 'Invalid output quality '+info.outputs[o] })
                    if (!Number.isInteger(info.maxSize) || info.maxSize < MB) return socket.emit('error', { method: 'auth', error: 'Invalid max size' })

                    Auth.authenticate(info.access_token,info.keychain,false,(e,user,network) => {
                        if (e) return socket.emit('error', { method: 'auth', error: e })

                        let fullUsername = db.toFullUsername(user,network,false)
                        if (!Config.Encoder.accounts.includes(fullUsername) && !Config.Encoder.accounts.includes(user))
                            return socket.emit('error',{ method: 'auth', error: 'not authorized as encoder' })
                        else if (encoderRegister[fullUsername] && encoderRegister[fullUsername].socket && encoderRegister[fullUsername].socket.id !== socket.id)
                            return socket.emit('error', { method: 'auth', error: 'duplicate connections' })

                        uploadOps.remoteEncoderRegister(fullUsername,socket,info.encoder,info.quality,info.outputs,info.maxSize)

                        socket.emit('result', { method: 'auth', success: true, username: fullUsername })
                    })
                })

                socket.on('status',() => {
                    for (let r in encoderRegister)
                        if (encoderRegister[r].socket && encoderRegister[r].socket.id === socket.id) {
                            return socket.emit('status', {
                                lastAuth: encoderRegister[r].lastAuth,
                                queue: encoderRegister[r].queue
                            })
                        }
                    
                    return socket.emit('error', { method: 'status', error: 'not authenticated or session expired' })
                })

                socket.on('joberror',(joberror) => {
                    let r = getEncoderBySocket(socket)
                    if (!r)
                        return socket.emit('error', { method: 'joberror', error: 'not authenticated or session expired' })
                    else if (encoderRegister[r].queue.length >= 1 && encoderRegister[r].queue[0].id === joberror.id) {
                        emitToUID(joberror.id,'error',{ error: joberror.error },false)
                        remoteEncoderNext(r)
                    } else
                        return socket.emit('error', { method: 'joberror', error: 'upload id is not in queue' })
                })

                socket.on('jobbegin', async (jobbegin) => {
                    let r = getEncoderBySocket(socket)
                    if (!r)
                        socket.emit('error', { method: 'jobbegin', error: 'not authenticated or session expired' })
                    else if (encoderRegister[r].queue.length >= 1 && encoderRegister[r].queue[0].id === jobbegin.id) {
                        if (jobbegin.step === 'encode')
                            if (Array.isArray(jobbegin.outputs) && jobbegin.outputs.length > 0) {
                                for (let i in jobbegin.outputs)
                                    if (!Number.isInteger(jobbegin.outputs[i]))
                                        return socket.emit('error', { method: 'jobbegin', error: 'output #'+i+' is not a valid integer resolution' })
                                    else if (!helpers.getHlsBw(jobbegin.outputs[i]))
                                        return socket.emit('error', { method: 'jobbegin', error: 'output #'+i+' is not a supported resolution' })
                                emitToUID(jobbegin.id,'begin',jobbegin,true)
                                encoderRegister[r].outputs = jobbegin.outputs
                                encoderRegister[r].step = 'encode'
                            } else
                                socket.emit('error', { method: 'jobbegin', error: 'outputs must be an array of output resolutions' })
                        else if (jobbegin.step === 'upload') {
                            if (!Array.isArray(encoderRegister[r].outputs))
                                return socket.emit('error', { method: 'jobbegin', error: 'encode step not registered yet' })
                            encoderRegister[r].step = 'upload'

                            // Prepare folders
                            fs.mkdirSync(defaultDir+'/'+jobbegin.id)
                            for (let res in encoderRegister[r].outputs)
                                fs.mkdirSync(defaultDir+'/'+jobbegin.id+'/'+encoderRegister[r].outputs[res]+'p')

                            // Callback to start uploading
                            socket.emit('result', { method: 'upload', id: jobbegin.id })
                        } else if (jobbegin.step === 'fetch')
                            encoderRegister[r].step = 'fetch'
                        else if (jobbegin.step === 'postupload') {
                            // post processing
                            if (!fs.existsSync(defaultDir+'/'+jobbegin.id))
                                return socket.emit('error', { method: 'jobbegin', id: jobbegin.id, error: 'container does not exist yet' })
                            emitToUID(jobbegin.id,'begin',{ step: 'container' }, true)

                            // Master playlist, thumbnail
                            let masterPlaylist = await helpers.createMasterPlaylist(defaultDir+'/'+jobbegin.id,encoderRegister[r].outputs)
                            if (!masterPlaylist.success) {
                                emitToUID(jobbegin.id,'error',{ error: masterPlaylist.error },false)
                                socket.emit('error', { method: 'jobbegin', id: jobbegin.id, error: error })
                                return remoteEncoderNext(r)
                            }
                            let hasThumbnail = helpers.hlsThumbnail(encoderRegister[r].queue[0].thumbnail,defaultDir,defaultDir+'/'+jobbegin.id)

                            // Add container to IPFS
                            emitToUID(jobbegin.id,'begin',{ step: 'ipfsadd' },true)
                            let ipfsaddop = await helpers.addHlsToIPFS(ipfsAPI,globSource,defaultDir,jobbegin.id,(addProgress) => {
                                emitToUID(jobbegin.id,'progress',{
                                    job: 'ipfsadd',
                                    progress: addProgress.progress,
                                    total: addProgress.total
                                },true)
                            })
                            if (ipfsaddop.error) {
                                emitToUID(jobbegin.id,'error',{ error: ipfsaddop.error },false)
                                return remoteEncoderNext(r)
                            }

                            // Record in db and return result
                            db.recordHash(encoderRegister[r].queue[0].user,encoderRegister[r].queue[0].network,'hls',ipfsaddop.folderhash.cid.toString(),ipfsaddop.folderhash.size)
                            db.writeHashesData()
                            db.writeHashInfoData()

                            let result = {
                                username: encoderRegister[r].queue[0].user,
                                network: encoderRegister[r].queue[0].network,
                                type: 'hls',
                                ipfshash: ipfsaddop.folderhash.cid.toString(),
                                spritehash: ipfsaddop.spritehash,
                                size: ipfsaddop.folderhash.size,
                                duration: encoderRegister[r].queue[0].duration,
                                hasThumbnail: hasThumbnail,
                                resolutions: encoderRegister[r].outputs,
                                encoder: r
                            }
                            console.log(result)
                            emitToUID(jobbegin.id,'result',result,false)
                            delete socketRegister[jobbegin.id]
                            uploadRegister[jobbegin.id] = result
                            ipsync.emit('upload',result)
                            remoteEncoderNext(r)
                        }
                        else
                            socket.emit('error', { method: 'jobbegin', error: 'invalid step' })
                    } else
                        socket.emit('error', { method: 'jobbegin', error: 'upload id is not first in queue' })
                })

                socket.on('jobprogress',(jobprogress) => {
                    let r = getEncoderBySocket(socket)
                    if (!r)
                        socket.emit('error', { method: 'jobprogress', error: 'not authenticated or session expired' })
                    else if (encoderRegister[r].queue.length >= 1 && encoderRegister[r].queue[0].id === jobprogress.id)
                        emitToUID(jobprogress.id,'progress',jobprogress,true)
                    else
                        socket.emit('error', { method: 'jobprogress', error: 'upload id is not first in queue' })
                })

                socket.on('disconnect',() => {
                    let r = getEncoderBySocket(socket)
                    if (r && encoderRegister[r].socket)
                        delete encoderRegister[r].socket
                })
            })

            // regularly cleanup spk pins register
            setInterval(() => {
                for (let i in spkPinsRegister)
                    if ((spkPinsRegister[i].status === 0 && spkPinsRegister[i].ts <= new Date().getTime() - (SPK_PIN_REGISTER_TIMEOUT_RUNNING_HRS*1000*3600)) ||
                        (spkPinsRegister[i].ts <= new Date().getTime() - (SPK_PIN_REGISTER_TIMEOUT_RESULTED_HRS*1000*3600)))
                        delete spkPinsRegister[i]
            },60000)
        },
        activeCount: () => {
            return usercount
        },
        randomID: () => {
            let permlink = ""
            let possible = "abcdefghijklmnopqrstuvwxyz0123456789"
            for (let i = 0; i < 15; i++)
                permlink += possible.charAt(Math.floor(Math.random() * possible.length))
            return permlink
        }
    }
}

module.exports = uploadOps