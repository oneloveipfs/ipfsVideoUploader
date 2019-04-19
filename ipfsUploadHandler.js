const Multer = require('multer')
const IPFS = require('ipfs-http-client')
const Shell = require('shelljs')
const getDuration = require('get-video-duration')
const fs = require('fs')
const async = require('async')
const sanitize = require('sanitize-filename')
const WebVTT = require('node-webvtt')
const Config = require('./config.json')
const db = require('./dbManager')

const ipfsAPI = IPFS('localhost',Config.IPFS_API_PORT,{protocol: 'http'})
const upload = Multer({ dest: './uploaded/' })
const imgUpload = Multer({ dest: './imguploads/', limits: { fileSize: 7340032 } })

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
                    fs.readFile(videoPathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: true},(err,file) => {
                            if (err) return cb(err)
                            cb(null,file[0].hash)
                        })
                    })
                },
                spritehash: (cb) => {
                    Shell.exec('./scripts/dtube-sprite.sh ' + videoPathName + ' uploaded/' + sourceVideoFilename + '.jpg',() => {
                        fs.readFile('uploaded/' + sourceVideoFilename + '.jpg',(err,data) => {
                            if (err) return cb(err)
                            ipfsAPI.add(data,{trickle: true},(err,file) => {
                                if (err) return cb(err)
                                cb(null,file[0].hash)
                            })
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
                    
                    fs.rename('uploaded/' + snapFilename,snapPathName,() => {})
                    fs.readFile(snapPathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: false},(err,file) => {
                            if (err) return cb(err)
                            cb(null,file[0].hash)
                        })
                    })
                }
            }
    
            // Add encoded versions to IPFS as well if available
            if (request.files.Video240Upload) {
                ipfsops.video240hash = (cb) => {
                    let video240PathName = 'uploaded/' + sourceVideoFilename + '_240.mp4'
                    fs.renameSync('uploaded/' + request.files.Video240Upload[0].filename,video240PathName)
                    fs.readFile(video240PathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: true},(err,file) => {
                            if (err) return cb(err)
                            cb(null,file[0].hash)
                        })
                    })
                }
            }
    
            if (request.files.Video480Upload) {
                ipfsops.video480hash = (cb) => {
                    let video480PathName = 'uploaded/' + sourceVideoFilename + '_480.mp4'
                    fs.renameSync('uploaded/' + request.files.Video480Upload[0].filename,video480PathName)
                    fs.readFile(video480PathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: true},(err,file) => {
                            if (err) return cb(err)
                            cb(null,file[0].hash)
                        })
                    })
                }
            }
    
            if (request.files.Video720Upload) {
                ipfsops.video720hash = (cb) => {
                    let video720PathName = 'uploaded/' + sourceVideoFilename + '_720.mp4'
                    fs.renameSync('uploaded/' + request.files.Video720Upload[0].filename,video720PathName)
                    fs.readFile(video720PathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: true},(err,file) => {
                            if (err) return cb(err)
                            cb(err,file[0].hash)
                        })
                    })
                }
            }
    
            if (request.files.Video1080Upload) {
                ipfsops.video1080hash = (cb) => {
                    let video1080PathName = 'uploaded/' + sourceVideoFilename + '_1080.mp4'
                    fs.renameSync('uploaded/' + request.files.Video1080Upload[0].filename,video1080PathName)
                    fs.readFile(video1080PathName,(err,data) => {
                        if (err) return cb(err)
                        ipfsAPI.add(data,{trickle: true},(err,file) => {
                            if (err) return cb(err)
                            cb(null,file[0].hash)
                        })
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
                    // Send IPFS hashes, duration and filesize back to client
                    response.send({
                        ipfshash: results.videohash,
                        ipfs240hash: results.video240hash,
                        ipfs480hash: results.video480hash,
                        ipfs720hash: results.video720hash,
                        ipfs1080hash: results.video1080hash,
                        snaphash: results.snaphash,
                        spritehash: results.spritehash,
                        duration: videoDuration,
                        filesize: videoSize,
                        dtubefees: Config.dtubefees
                    })
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
            fs.readFile('imguploads/' + uploadedImg,(err,data) => ipfsAPI.add(data,{trickle: trickleDagAdd},(err,file) => {
                if (Config.UsageLogs) {
                    // Log usage data for image uploads
                    db.recordUsage(username,imgType,request.file.size)
                    db.writeUsageData()
                }

                // Log IPFS hashes by Steem account
                // If hash is not in database, add the hash into database
                db.recordHash(username,imgType,file[0].hash)
                db.writeHashesData()

                // Send image IPFS hash back to client
                response.send({
                    imghash: file[0].hash
                })
            }))
        })
    },
    uploadSubtitles: (username,request,response) => {
        try {
            WebVTT.parse(request.body)
        } catch (err) {
            return response.status(400).send({error: 'Subtitle error: ' + err})
        }

        let subtitleBuffer = new Buffer.from(request.body,'utf8')
        ipfsAPI.add(subtitleBuffer,(err,result) => {
            if (err) return response.status(500).send({error: 'IPFS error: ' + err})
            if (Config.UsageLogs) {
                db.recordUsage(username,'subtitles',result[0].size)
                db.writeUsageData()
            }

            db.recordHash(username,'subtitles',result[0].hash)
            db.writeHashesData()

            response.send({
                hash: result[0].hash
            })
        })
    }
}

module.exports = uploadOps