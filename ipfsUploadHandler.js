const Multer = require('multer')
const IPFS = require('ipfs-http-client')
const Shell = require('shelljs')
const getDuration = require('get-video-duration')
const fs = require('fs')
const async = require('async')
const sanitize = require('sanitize-filename')
const WebVTT = require('node-webvtt')
const MimeType = require('mime-types')
const Socket = require('socket.io')
const Config = require('./config.json')
const db = require('./dbManager')
const Auth = require('./authManager')

let SocketIO
let ipsync
let uplstatusio
let usercount = 0

let uploadRegister = JSON.parse(fs.readFileSync('db/register.json','utf8'))
let socketRegister = {}

const ipfsAPI = IPFS({ host: 'localhost', port: '5001', protocol: 'http' })
const upload = Multer({ dest: './uploaded/' })
const imgUpload = Multer({ dest: './imguploads/', limits: { fileSize: 7340032 } })
const { globSource } = IPFS

async function addFile(dir,trickle,callback) {
    let ipfsAdd = ipfsAPI.add(globSource(dir, {recursive: true}), { trickle: trickle })

    for await (const file of ipfsAdd) {
        callback(file.cid.toString())
        break
    }
}

function processSingleVideo(id,user,cb) {
    let vpath = Config.tusdUploadDir + '/' + id
    if (!fs.existsSync(vpath)) return cb({ error: 'Could not find upload' })
    Shell.exec('./scripts/dtube-sprite.sh ' + vpath + ' uploaded/' + id + '.jpg',() => addFile('uploaded/' + id + '.jpg',true,(hash) => fs.stat('uploaded/' + id + '.jpg',(err,stat) => {
        !err ? db.recordUsage(user,'sprites',stat['size']) 
            : console.log('Error getting sprite filesize: ' + err)
        
        db.writeUsageData()
        db.recordHash(user,hash)
        db.writeHashesData()

        getDuration(vpath).then((duration) => {
            let result = {
                username: user,
                type: 'videos',
                ipfshash: uploadRegister[id].hash,
                spritehash: hash,
                duration: duration
            }

            uploadRegister[id] = result
            cb(result)
        })
    })))
}

let uploadOps = {
    uploadVideo: (username,request,response) => {
        upload.fields([
            {name: 'VideoUpload', maxCount: 1},
            {name: 'SnapUpload', maxCount: 1},
            {name: 'Video240Upload', maxCount: 1},
            {name: 'Video480Upload', maxCount: 1},
            {name: 'Video720Upload', maxCount: 1},
            {name: 'Video1080Upload', maxCount: 1},
        ])(request,response,function(err) {
            request.socket.setTimeout(0)
            if (err) return response.status(400).send({error: err})
            if (!request.files.VideoUpload) return response.status(400).send({error: 'Source video upload not found.'})
    
            // Add video to IPFS
            let sourceVideoFilename = sanitize(request.files.VideoUpload[0].filename)
            let videoPathName = 'uploaded/' + sourceVideoFilename + '.mp4'
            fs.renameSync('uploaded/' + sourceVideoFilename,videoPathName)
    
            // Generate sprite from source video, and add all uploaded files to IPFS
            let ipfsops = {
                videohash: (cb) => {
                    addFile(videoPathName,true,(hash) => {
                        cb(null,hash)
                    })
                },
                spritehash: (cb) => {
                    Shell.exec('./scripts/dtube-sprite.sh ' + videoPathName + ' uploaded/' + sourceVideoFilename + '.jpg',() => {
                        addFile('uploaded/' + sourceVideoFilename + '.jpg',true,(hash) => {
                            cb(null,hash)
                        })
                    })
                }
            }

            if (request.files.SnapUpload) {
                ipfsops.snaphash = (cb) => {
                    let snapFilename = request.files.SnapUpload[0].filename
                    let snapPathName = request.files.SnapUpload[0].mimetype === 'image/jpeg' ? 'uploaded/' + snapFilename + '.jpg'
                                      :request.files.SnapUpload[0].mimetype === 'image/png' ? 'uploaded/' + snapFilename + '.png'
                                      : 'uploaded/' + snapFilename
                    
                    fs.rename('uploaded/' + snapFilename,snapPathName,() => {
                        addFile(snapPathName,false,(hash) => {
                            cb(null,hash)
                        })
                    })
                }
            }
    
            // Add encoded versions to IPFS as well if available
            if (request.files.Video240Upload) {
                ipfsops.video240hash = (cb) => {
                    let video240PathName = 'uploaded/' + sourceVideoFilename + '_240.mp4'
                    fs.renameSync('uploaded/' + request.files.Video240Upload[0].filename,video240PathName)
                    addFile(video240PathName,true,(hash) => {
                        cb(null,hash)
                    })
                }
            }
    
            if (request.files.Video480Upload) {
                ipfsops.video480hash = (cb) => {
                    let video480PathName = 'uploaded/' + sourceVideoFilename + '_480.mp4'
                    fs.renameSync('uploaded/' + request.files.Video480Upload[0].filename,video480PathName)
                    addFile(video480PathName,true,(hash) => {
                        cb(null,hash)
                    })
                }
            }
    
            if (request.files.Video720Upload) {
                ipfsops.video720hash = (cb) => {
                    let video720PathName = 'uploaded/' + sourceVideoFilename + '_720.mp4'
                    fs.renameSync('uploaded/' + request.files.Video720Upload[0].filename,video720PathName)
                    addFile(video720PathName,true,(hash) => {
                        cb(null,hash)
                    })
                }
            }
    
            if (request.files.Video1080Upload) {
                ipfsops.video1080hash = (cb) => {
                    let video1080PathName = 'uploaded/' + sourceVideoFilename + '_1080.mp4'
                    fs.renameSync('uploaded/' + request.files.Video1080Upload[0].filename,video1080PathName)
                    addFile(video1080PathName,true,(hash) => {
                        cb(null,hash)
                    })
                }
            }
    
            // Add everything to IPFS asynchronously
            async.parallel(ipfsops,(err,results) => {
                if (err) console.log(err)
                console.log(results)
                // Get video duration and file size
                let videoSize = request.files.VideoUpload[0].size
                if (Config.UsageLogs) fs.stat('uploaded/' + sanitize(sourceVideoFilename) + '.jpg',(err,stat) => {
                    // Log usage data if no errors and if logging is enabled
                    db.recordUsage(username,'videos',videoSize)
                    if (results.snaphash) db.recordUsage(username,'thumbnails',request.files.SnapUpload[0].size)
    
                    !err ? db.recordUsage(username,'sprites',stat['size']) 
                        : console.log('Error getting sprite filesize: ' + err)
    
                    // Log encoded video disk usage only if available
                    if (results.video240hash) db.recordUsage(username,'video240',request.files.Video240Upload[0].size)
                    if (results.video480hash) db.recordUsage(username,'video480',request.files.Video480Upload[0].size)
                    if (results.video720hash) db.recordUsage(username,'video720',request.files.Video720Upload[0].size)
                    if (results.video1080hash) db.recordUsage(username,'video1080',request.files.Video1080Upload[0].size)
    
                    db.writeUsageData()
                })
    
                // Log IPFS hashes by Steem account
                // If hash is not in database, add the hash into database
                db.recordHash(username,'videos',results.videohash)
                if (results.snaphash) db.recordHash(username,'thumbnails',results.snaphash)
                db.recordHash(username,'sprites',results.spritehash)
    
                // Add encoded video hashes into database if available
                if (results.video240hash) db.recordHash(username,'video240',results.video240hash)
                if (results.video480hash) db.recordHash(username,'video480',results.video480hash)
                if (results.video720hash) db.recordHash(username,'video720',results.video720hash)
                if (results.video1080hash) db.recordHash(username,'video1080',results.video1080hash)
    
                db.writeHashesData()
    
                getDuration(videoPathName).then((videoDuration) => {
                    // Send IPFS hashes, duration and filesize back to client and IPSync
                    let result = {
                        username: username,
                        ipfshash: results.videohash,
                        ipfs240hash: results.video240hash,
                        ipfs480hash: results.video480hash,
                        ipfs720hash: results.video720hash,
                        ipfs1080hash: results.video1080hash,
                        snaphash: results.snaphash,
                        spritehash: results.spritehash,
                        duration: videoDuration,
                        filesize: videoSize
                    }
                    response.send(result)
                    ipsync.emit('upload',result)
                })
            })
        })
    },
    uploadImage: (username,request,response) => {
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
            addFile('imguploads/' + uploadedImg,trickleDagAdd,(hash) => {
                if (Config.UsageLogs) {
                    // Log usage data for image uploads
                    db.recordUsage(username,imgType,request.file.size)
                    db.writeUsageData()
                }

                // Log IPFS hashes by Steem account
                // If hash is not in database, add the hash into database
                db.recordHash(username,imgType,hash)
                db.writeHashesData()

                // Send image IPFS hash back to client and IPSync
                let result = {
                    username: username,
                    imghash: hash,
                    imgtype: imgType
                }
                response.send(result)
                ipsync.emit('upload',result)
            })
        })
    },
    uploadSubtitles: async (username,request,response) => {
        try {
            WebVTT.parse(request.body)
        } catch (err) {
            return response.status(400).send({error: 'Subtitle error: ' + err})
        }

        let subtitleBuffer = new Buffer.from(request.body,'utf8')
        let ipfsAddSubtitleOp = ipfsAPI.add(subtitleBuffer)
        
        for await (const sub of ipfsAddSubtitleOp) {
            if (Config.UsageLogs) {
                db.recordUsage(username,'subtitles',sub.size)
                db.writeUsageData()
            }

            db.recordHash(username,'subtitles',sub.cid.toString())
            db.writeHashesData()

            let result = {
                username: username,
                hash: sub.cid.toString()
            }
            response.send(result)
            ipsync.emit('upload',result)

            break
        }
    },
    handleTusUpload: (json,user,callback) => {
        let filepath = json.Upload.Storage.Path
        switch (json.Upload.MetaData.type) {
            case 'videos':
                let ipfsops = {
                    videohash: (cb) => {
                        addFile(filepath,true,(hash) => cb(null,hash))
                    },
                    spritehash: (cb) => {
                        Shell.exec('./scripts/dtube-sprite.sh ' + filepath + ' uploaded/' + json.Upload.ID + '.jpg',() => {
                            addFile('uploaded/' + json.Upload.ID + '.jpg',true,(hash) => {
                                cb(null,hash)
                            })
                        })
                    }
                }

                async.parallel(ipfsops,(errors,results) => {
                    if (errors) console.log(errors)
                    console.log(results)
                    if (Config.UsageLogs) fs.stat('uploaded/' + json.Upload.ID + '.jpg',(err,stat) => {
                        db.recordUsage(user,'videos',json.Upload.Size)
                        !err ? db.recordUsage(user,'sprites',stat['size']) 
                            : console.log('Error getting sprite filesize: ' + err)
                        
                        db.writeUsageData()
                    })

                    db.recordHash(user,'videos',results.videohash)
                    db.recordHash(user,'sprites',results.spritehash)
                    db.writeHashesData()

                    getDuration(json.Upload.Storage.Path).then((videoDuration) => {
                        let result = {
                            username: user,
                            type: 'videos',
                            ipfshash: results.videohash,
                            spritehash: results.spritehash,
                            duration: videoDuration,
                            filesize: json.Upload.Size
                        }

                        if (socketRegister[json.Upload.ID] && socketRegister[json.Upload.ID].socket) socketRegister[json.Upload.ID].socket.emit('result',result)
                        delete socketRegister[json.Upload.ID]
                        uploadRegister[json.Upload.ID] = result
                        ipsync.emit('upload',result)
                        callback()
                    })
                })
                break
            case 'video240':
            case 'video480':
            case 'video720':
            case 'video1080':
                addFile(filepath,true,(hash) => {
                    if (Config.UsageLogs) {
                        db.recordUsage(user,json.Upload.MetaData.type,json.Upload.Size)
                        db.writeUsageData()
                    }

                    db.recordHash(user,json.Upload.MetaData.type,hash)
                    db.writeHashesData()

                    let result = { 
                        username: user,
                        type: json.Upload.MetaData.type,
                        hash: hash
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
    writeUploadRegister: () => {
        fs.writeFile('db/register.json',JSON.stringify(uploadRegister),() => {})
    },
    IPSync: {
        init: (server) => {
            SocketIO = Socket(server)
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
                    Auth.authenticate(info.access_token,info.keychain,(e,user) => {
                        if (e) return socket.emit('result', { error: 'Auth error: ' + JSON.stringify(e) })
                        
                        // Upload ID not found in register, register socket
                        if (!uploadRegister[info.id]) return socketRegister[info.id] = {
                            socket: socket,
                            ts: 0 // TODO: Clear sockets from cache after x minutes
                        }

                        // Upload ID exist in register and matches type requested, return result immediately
                        if (info.type === uploadRegister[info.id].type) return socket.emit('result',uploadRegister[info.id])
                        
                        // Type requested does not match registered type
                        // Encoded video hash requested, return only hash
                        if (info.type !== 'videos') return socket.emit('result',{
                            username: uploadRegister[info.id].username,
                            type: info.type,
                            hash: uploadRegister[info.id].hash || uploadRegister[info.id].ipfshash
                        })

                        // Or else if "videos" type requested, generate sprites, duration etc
                        processSingleVideo(info.id,user,(result) => {
                            socket.emit('result',result)
                        })
                    })
                })
            })
        },
        activeCount: () => {
            return usercount
        }
    }
}

module.exports = uploadOps