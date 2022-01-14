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
const globSource = IPFS.globSource
const defaultDir = process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs'

let SocketIO
let ipsync
let uplstatusio
let usercount = 0

db.setupDb('register')

ffmpeg.setFfmpegPath(Config.Encoder.ffmpegPath ? Config.Encoder.ffmpegPath : Shell.which('ffmpeg').toString())
ffmpeg.setFfprobePath(Config.Encoder.ffprobePath ? Config.Encoder.ffprobePath : Shell.which('ffprobe').toString())

const encoderQueue = new ProcessingQueue()
const encoderOptions = [
    '-hls_time 5',
    '-hls_list_size 0',
    '-segment_time 10',
    '-segment_format mpegts',
    '-f segment',
    Config.Encoder.quality
]
const hlsBandwidth = {
    4320: 20000000,
    2160: 6000000,
    1440: 4000000,
    1080: 2000000,
    720: 1256000,
    480: 680000,
    240: 340000
}

let uploadRegister = JSON.parse(fs.readFileSync(defaultDir+'/db/register.json','utf8'))
let socketRegister = {}

const emitToUID = (id,evt,message,updateTs) => {
    if (socketRegister[id] && socketRegister[id].socket) {
        if (updateTs)
            socketRegister[id].ts = new Date().getTime()
        socketRegister[id].socket.emit(evt,message)
    }
}

const ipfsAPI = IPFS.create({ host: 'localhost', port: Config.IPFS_API_PORT, protocol: 'http' })
const streamUpload = Multer({ dest: defaultDir, limits: { fileSize: 52428800 } }) // 50MB segments
const imgUpload = Multer({ dest: defaultDir, limits: { fileSize: 7340032 } })

const imgFilenameChars = 'abcdef0123456789'
const imgFilenameLength = 32
const isValidImgFname = (filename = '') => {
    if (filename.length === imgFilenameLength) {
        for (let c in filename)
            if (imgFilenameChars.indexOf(filename[c]) === -1)
                return false
        return true
    } else
        return false
}

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
                'content-type': formData.getHeaders()['content-type'] 
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

const createSpriteInContainer = async (filepath,id) => {
    return new Promise((rs) => Shell.exec(__dirname+'/../scripts/dtube-sprite.sh ' + filepath + ' ' + defaultDir + '/' + id + '/sprite.jpg',() => rs()))
}

const getFFprobeVideo = (filepath) => {
    return new Promise((rs,rj) => {
        ffmpeg.ffprobe(filepath,(e,probe) => {
            if (e)
                return rj(e)
            let width, height, duration, orientation
            for (s in probe.streams)
                if (probe.streams[s].codec_type === 'video') {
                    width = probe.streams[s].width,
                    height = probe.streams[s].height,
                    duration = probe.format.duration
                    if (width > height)
                        orientation = 1 // horizontal
                    else
                        orientation = 2 // square or vertical
                    break
                }
            return rs({ width, height, duration, orientation })
        })
    })
}

const recursiveFileCount = (dir) => {
    let c = fs.readdirSync(dir).filter((v) => !v.startsWith('.'))
    let l = c.length
    for (let f in c)
        if (fs.lstatSync(dir+'/'+c[f]).isDirectory())
            l += recursiveFileCount(dir+'/'+c[f])
    return l
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
    db.writeHashSizesData()

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
                // Log IPFS hashes by Steem account
                // If hash is not in database, add the hash into database
                db.recordHash(username,network,imgType,hash,request.file.size)
                db.writeHashesData()
                db.writeHashSizesData()

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
                ipsync.emit('upload',result)
                if (Config.deleteUploadsAfterAdd && imgType !== 'thumbnails') fs.unlink(defaultDir+'/'+uploadedImg,()=>{})
            })
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
        db.writeHashSizesData()

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
            addFile(segmentDir,true,false,(size,hash) => {
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
        let chunkBuf = Buffer.from(request.body,'utf8')
        let ipfsAddBufOp = ipfsAPI.add(chunkBuf)

        for await (const chk of ipfsAddBufOp) {
            db.recordHash(username,network,'chunks',chk.cid.toString(),chk.size)
            db.writeHashesData()
            db.writeHashSizesData()

            let result = {
                username: username,
                network: network,
                type: 'chunks',
                hash: chk.cid.toString()
            }
            response.send(result)
            ipsync.emit('upload',result)
            break
        }
    },
    encoderQueue,
    handleTusUpload: (json,user,network,callback) => {
        let filepath = json.Upload.Storage.Path
        switch (json.Upload.MetaData.type) {
            case 'hls':
                getFFprobeVideo(filepath).then((d) => {
                    let { width, height, duration, orientation } = d
                    if (!width || !height || !duration || !orientation)
                        return emitToUID(json.Upload.ID,'error',{ error: 'could not retrieve ffprobe info on uploaded video' },false)

                    let outputResolutions = []
                    let sedge = Math.min(width,height)
                    for (let q in Config.Encoder.outputs)
                        if (hlsBandwidth[Config.Encoder.outputs[q]] && sedge >= Config.Encoder.outputs[q])
                            outputResolutions.push(Config.Encoder.outputs[q])
                    if (outputResolutions.length === 0)
                        outputResolutions.push(Config.Encoder.outputs[Config.Encoder.outputs.length-1])
                    outputResolutions = outputResolutions.sort((a,b) => a-b)
                    
                    // TODO: Remote encoders
                    // Create folders
                    fs.mkdirSync(defaultDir+'/'+json.Upload.ID)
                    for (let r in outputResolutions)
                        fs.mkdirSync(defaultDir+'/'+json.Upload.ID+'/'+outputResolutions[r]+'p')
                    
                    // Encoding ops
                    const ffmpegbase = ffmpeg(filepath)
                        .videoCodec(Config.Encoder.encoder)
                        .audioCodec('aac')
                    const ops = {}
                    for (let r in outputResolutions) {
                        let resolution = outputResolutions[r]
                        ops[resolution] = (cb) =>
                            ffmpegbase.clone()
                                .output(defaultDir+'/'+json.Upload.ID+'/'+resolution+'p/%d.ts')
                                .audioBitrate('256k')
                                .addOption(encoderOptions)
                                .addOption('-segment_list',defaultDir+'/'+json.Upload.ID+'/'+resolution+'p/index.m3u8')
                                .size(orientation === 1 ? '?x'+resolution : resolution+'x?')
                                .on('progress',(p) => {
                                    emitToUID(json.Upload.ID,'progress',{
                                        job: 'encode',
                                        resolution: resolution,
                                        frames: p.frames,
                                        fps: p.currentFps,
                                        progress: p.percent
                                    },true)
                                    console.log('ID '+json.Upload.ID+' - '+resolution+'p --- Frames: '+p.frames+'   FPS: '+p.currentFps+'   Progress: '+p.percent.toFixed(3)+'%')
                                })
                                .on('error',(e) => {
                                    console.error(json.Upload.ID+' - '+resolution+'p --- Error',e)
                                    emitToUID(json.Upload.ID,'error',{ error: resolution + 'p resolution encoding failed' },false)
                                    cb(e)
                                })
                                .on('end',() => cb(null))
                                .run()
                    }
                    if (json.Upload.MetaData.createSprite)
                        ops.sprite = (cb) => createSpriteInContainer(filepath,json.Upload.ID).then(() => cb(null))
                    encoderQueue.push({ id: json.Upload.ID, f: (nextJob) => async.parallel(ops, async (e) => {
                        if (e)
                            return nextJob()
                        
                        // Construct master playlist
                        let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3'
                        for (let r in outputResolutions) {
                            let rd
                            try {
                                rd = await getFFprobeVideo(defaultDir+'/'+json.Upload.ID+'/'+outputResolutions[r]+'p/0.ts')
                            } catch {
                                emitToUID(json.Upload.ID,'error',{ error: 'could not retrieve ffprobe info on '+outputResolutions[r]+'p encoded video' },false)
                                return nextJob()
                            }
                            masterPlaylist += '\n#EXT-X-STREAM-INF:BANDWIDTH='+hlsBandwidth[outputResolutions[r]]+',RESOLUTION='+rd.width+'x'+rd.height+'\n'+outputResolutions[r]+'p/index.m3u8'
                        }
                        fs.writeFileSync(defaultDir+'/'+json.Upload.ID+'/default.m3u8',masterPlaylist)

                        // Add thumbnail image file in container
                        let hasThumbnail = false
                        if (isValidImgFname(json.Upload.MetaData.thumbnailFname) && fs.existsSync(defaultDir+'/'+json.Upload.MetaData.thumbnailFname)) {
                            fs.copyFileSync(defaultDir+'/'+json.Upload.MetaData.thumbnailFname,defaultDir+'/'+json.Upload.ID+'/thumbnail.jpg')
                            hasThumbnail = true
                        }

                        // Add container to IPFS
                        // TODO: Add to Skynet whenever applicable
                        let folderhash, spritehash
                        let addProgress = {
                            progress: 0,
                            total: recursiveFileCount(defaultDir+'/'+json.Upload.ID) + 1
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
                        db.writeHashSizesData()

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
                    })})
                })
                break
            case 'videos':
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
                    db.writeHashSizesData()

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
                addFile(filepath,true,Config.Skynet.enabled && json.Upload.MetaData.skynet == 'true',(size,hash,skylink) => {
                    db.recordHash(user,network,json.Upload.MetaData.type,hash,json.Upload.Size)
                    db.writeHashesData()
                    db.writeHashSizesData()

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
    writeUploadRegister: () => {
        fs.writeFile(defaultDir+'/db/register.json',JSON.stringify(uploadRegister),() => {})
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
                    if (!info.id) return socket.emit('result', { error: 'Missing upload ID' })
                    if (!info.type) return socket.emit('result', { error: 'Missing upload type' })
                    if (!info.access_token) return socket.emit('result', { error: 'Missing access token' })
                    if (!db.getPossibleTypes().includes(info.type)) return socket.emit('result', { error: 'Invalid upload type requested' })

                    // Authenticate & get username
                    Auth.authenticate(info.access_token,info.keychain,false,(e,user,network) => {
                        if (e) return socket.emit('result', { error: 'Auth error: ' + JSON.stringify(e) })
                        
                        // Upload ID not found in register, register socket
                        if (!uploadRegister[info.id]) return socketRegister[info.id] = {
                            socket: socket,
                            ts: new Date().getTime()
                        }

                        // Upload ID exist in register and matches type requested, return result immediately
                        if (info.type === uploadRegister[info.id].type) return socket.emit('result',uploadRegister[info.id])
                        
                        // Type requested does not match registered type
                        // HLS uploads do not transform into other upload types
                        if (info.type === 'hls') return socket.emit('error',{ error: 'hls uploads cannot be transformed' })

                        // Encoded video hash requested, return only hash
                        if (info.type !== 'videos') return socket.emit('result',{
                            username: uploadRegister[info.id].username,
                            type: info.type,
                            hash: uploadRegister[info.id].hash || uploadRegister[info.id].ipfshash
                        })

                        // Or else if "videos" type requested, generate sprites, duration etc
                        let uploadUser = user
                        if (request.body.Upload.MetaData.encoderUser && request.body.Upload.MetaData.encodingCost)
                            uploadUser = request.body.Upload.MetaData.encoderUser
                        processSingleVideo(info.id,uploadUser,network,(result) => {
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