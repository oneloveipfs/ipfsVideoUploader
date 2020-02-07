const Multer = require('multer')
const IPFS = require('ipfs-http-client')
const Shell = require('shelljs')
const getDuration = require('get-video-duration')
const fs = require('fs')
const async = require('async')
const sanitize = require('sanitize-filename')
const WebVTT = require('node-webvtt')
const Socket = require('socket.io')
const Config = require('./config.json')
const db = require('./dbManager')

let SocketIO
let ipsync

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
                    imghash: hash
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
            ipsync.emit(result)

            break
        }
    },
    IPSync: {
        init: (server) => {
            SocketIO = Socket(server)
            ipsync = SocketIO.of('/ipsync')

            ipsync.on('connection',(socket) => {
                socket.emit('message','Welcome to IPSync')
            })
        }
    }
}

module.exports = uploadOps