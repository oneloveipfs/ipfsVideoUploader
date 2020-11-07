const Multer = require('multer')
const IPFS = require('ipfs-http-client')
// const Skynet = require('@nebulous/skynet')
const Shell = require('shelljs')
const FormData = require('form-data')
const axios = require('axios')
const getDuration = require('get-video-duration')
const fs = require('fs')
const async = require('async')
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
const imgUpload = Multer({ dest: './imguploads/', limits: { fileSize: 7340032 } })
const { globSource } = IPFS

async function addFile(dir,trickle,skynetpin,callback,onlyHash) {
    let opts = { trickle: trickle, cidVersion: 0 }
    if (onlyHash) opts.onlyHash = true
    let ipfsAdd = await ipfsAPI.add(globSource(dir, {recursive: true}), opts)
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

function skynetAdd(path,opts) {
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

function trimTrailingSlash(str) {
    return str.replace(/\/$/, "");
}

function processSingleVideo(id,user,network,cb) {
    let vpath = Config.tusdUploadDir + '/' + id
    if (!fs.existsSync(vpath)) return cb({ error: 'Could not find upload' })
    Shell.exec('./scripts/dtube-sprite.sh ' + vpath + ' uploaded/' + id + '.jpg',() => addFile('uploaded/' + id + '.jpg',true,false,(size,hash) => {
        db.recordUsage(user,network,'sprites',size)
        db.recordHash(user,network,'videos',hash)
        db.writeUsageData()
        db.writeHashesData()

        getDuration(vpath).then((duration) => {
            let result = {
                username: user,
                network: network,
                type: 'videos',
                ipfshash: uploadRegister[id].hash,
                spritehash: hash,
                duration: duration
            }

            uploadRegister[id] = result
            cb(result)
        })
    }))
}

let uploadOps = {
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
            addFile('imguploads/' + uploadedImg,trickleDagAdd,false,(size,hash) => {
                if (Config.UsageLogs) {
                    // Log usage data for image uploads
                    db.recordUsage(username,network,imgType,request.file.size)
                    db.writeUsageData()
                }

                // Log IPFS hashes by Steem account
                // If hash is not in database, add the hash into database
                db.recordHash(username,network,imgType,hash)
                db.writeHashesData()

                // Send image IPFS hash back to client and IPSync
                let result = {
                    username: username,
                    network: network,
                    imghash: hash,
                    imgtype: imgType
                }
                response.send(result)
                ipsync.emit('upload',result)
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
        let ipfsAddSubtitleOp = ipfsAPI.add(subtitleBuffer)
        
        for await (const sub of ipfsAddSubtitleOp) {
            if (Config.UsageLogs) {
                db.recordUsage(username,network,'subtitles',sub.size)
                db.writeUsageData()
            }

            db.recordHash(username,network,'subtitles',sub.cid.toString())
            db.writeHashesData()

            let result = {
                username: username,
                network: network,
                type: 'subtitles',
                hash: sub.cid.toString()
            }
            response.send(result)
            ipsync.emit('upload',result)

            break
        }
    },
    handleTusUpload: (json,user,network,callback) => {
        let filepath = json.Upload.Storage.Path
        switch (json.Upload.MetaData.type) {
            case 'videos':
                let ipfsops = {
                    videohash: (cb) => {
                        addFile(filepath,true,Config.Skynet.enabled && json.Upload.MetaData.skynet == 'true',(size,hash,skylink) => cb(null,{ipfshash: hash, skylink: skylink, size: size}))
                    },
                    spritehash: (cb) => {
                        Shell.exec('./scripts/dtube-sprite.sh ' + filepath + ' uploaded/' + json.Upload.ID + '.jpg',() => {
                            addFile('uploaded/' + json.Upload.ID + '.jpg',true,false,(size,hash) => cb(null,{size: size, hash: hash}))
                        })
                    }
                }

                async.parallel(ipfsops,(errors,results) => {
                    if (errors) console.log(errors)
                    console.log(results)
                    if (Config.UsageLogs) {
                        db.recordUsage(user,network,'videos',json.Upload.Size)
                        db.recordUsage(user,network,'sprites',results.spritehash.size) 
                        db.writeUsageData()
                    }

                    db.recordHash(user,network,'videos',results.videohash.ipfshash)
                    db.recordHash(user,network,'sprites',results.spritehash.hash)
                    db.writeHashesData()

                    if (results.videohash.skylink) {
                        db.recordSkylink(user,network,'videos',results.videohash.skylink)
                        db.writeSkylinksData()
                    }

                    getDuration(json.Upload.Storage.Path).then((videoDuration) => {
                        let result = {
                            username: user,
                            network: network,
                            type: 'videos',
                            ipfshash: results.videohash.ipfshash,
                            spritehash: results.spritehash.hash,
                            skylink: results.videohash.skylink,
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
                addFile(filepath,true,Config.Skynet.enabled && json.Upload.MetaData.skynet == 'true',(size,hash,skylink) => {
                    if (Config.UsageLogs) {
                        db.recordUsage(user,network,json.Upload.MetaData.type,json.Upload.Size)
                        db.writeUsageData()
                    }

                    db.recordHash(user,network,json.Upload.MetaData.type,hash)
                    db.writeHashesData()

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
                    Auth.authenticate(info.access_token,info.keychain,false,(e,user,network) => {
                        if (e) return socket.emit('result', { error: 'Auth error: ' + JSON.stringify(e) })
                        
                        // Upload ID not found in register, register socket
                        if (!uploadRegister[info.id]) return socketRegister[info.id] = {
                            socket: socket,
                            ts: new Date().getTime() // TODO: Clear sockets from cache after x minutes
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
        }
    },
    // For unit tests
    addFile
}

module.exports = uploadOps