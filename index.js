const Multer = require('multer');
const IPFS = require('ipfs-http-client');
const Shell = require('shelljs');
const getDuration = require('get-video-duration');
const fs = require('fs');
const async = require('async');
const SteemConnect = require('steemconnect')
const sanitize = require('sanitize-filename');
const Config = require('./config.json');
const UpdateLogs = require('./db/updatelogs.json');
const db = require('./dbManager')
const Auth = require('./authManager')
const Express = require('express');
const Parser = require('body-parser');
const CORS = require('cors');
const https = require('https');
const app = Express();

const ipfsAPI = IPFS('localhost',Config.IPFS_API_PORT,{protocol: 'http'})
const upload = Multer({ dest: './uploaded/' });
const imgUpload = Multer({ dest: './imguploads/', limits: { fileSize: 7340032 } })

// If whitelist file doesn't exist create it
if (Config.whitelistEnabled && !fs.existsSync('whitelist.txt')) {
    fs.writeFileSync('./whitelist.txt','')
}

// Setup HTTPS if needed
let credentials;
if (Config.useHTTPS) {
    let privateKey = fs.readFileSync(Config.HTTPS_PrivKey_Dir,'utf8');
    let certificate = fs.readFileSync(Config.HTTPS_Cert_Dir,'utf8');
    let ca = fs.readFileSync(Config.HTTPS_CertAuth_Dir,'utf8');

    credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    }
}

// Prohibit access to certain files through HTTP
app.get('/index.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/dbManager.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/authManager.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/scripts/generateKeys.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/scripts/getLoginLink.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/whitelist.txt',(req,res) => {return res.status(404).redirect('/404')})
app.get('/config.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package-lock.json',(req,res) => {return res.status(404).redirect('/404')})

app.use(Express.static(__dirname, { dotfiles: 'deny' }));
app.use(Parser.text())

// HTTP to HTTPS redirect
if (Config.useHTTPS) {
    app.use(function(req,res,next) {
        if (req.secure) {
           next(); 
        } else {
           res.redirect(301,'https://' + req.headers.host + req.url);
        }
    });
}

app.get('/', (request,response) => {
    // Welcome page
    loadWebpage('./client/welcome.html',response);
});

app.get('/reviews', (request,response) => {
    // Review page
    loadWebpage('./client/reviews.html',response)
})

app.get('/upload', (request,response) => {
    // Uploader page
    loadWebpage('./client/uploader.html',response);
});

app.get('/404', (request,response) => {
    // 404 page
    loadWebpage('./client/404.html',response);
})

app.get('/checkuser', CORS(), (request,response) => {
    // Check if user is in whitelist
    if (Config.whitelistEnabled)
        if (!Auth.whitelist().includes(request.query.user)) 
            return response.send({isInWhitelist: false})

    response.send({isInWhitelist: true})
});

app.get('/login',(request,response) => {
    // Steem Keychain Auth
    if ((request.query.user === undefined) || request.query.user === '')
        // Username not specified, throw an error
        return response.send({error: 'Username not specified!'})

    if (Config.whitelistEnabled)
        if (!Auth.whitelist().includes(request.query.user))
            return response.send({error: 'Looks like you do not have access to the uploader!'})

    Auth.generateEncryptedMemo(request.query.user,(err,memo) => {
        if (err) return response.send({error: err})
        response.send({encrypted_memo: memo, error: null})
    })
});

app.post('/logincb',(request,response) => {
    // Keychain Auth Callback
    Auth.decryptMessage(request.body,(decoded) => {
        if (Config.whitelistEnabled)
            if (!Auth.whitelist().includes(decoded[0]))
                return response.send({error: 'Looks like you do not have access to the uploader!'})

        Auth.generateJWT(decoded[0],(err,token) => {
            if (err) return response.send({error: err})
            response.send({access_token: token, error: null})
        })
    })
})

app.get('/auth',(request,response) => {
    let access_token = request.query.access_token
    Auth.verifyAuth(access_token,(err,res) => {
        if (err) return response.send({error: err})
        else return response.send(res)
    })
})

app.post('/uploadVideo', (request,response) => {
    upload.fields([
        {name: 'VideoUpload', maxCount: 1},
        {name: 'SnapUpload', maxCount: 1},
        {name: 'Video240Upload', maxCount: 1},
        {name: 'Video480Upload', maxCount: 1},
        {name: 'Video720Upload', maxCount: 1},
        {name: 'Video1080Upload', maxCount: 1},
    ])(request,response,function(err) {
        request.socket.setTimeout(0)
        if (err) return response.send({error: err});

        // TODO: Obtain the actual username from API authentication
        let username = request.body.Username; //steem username

        // Add video to IPFS
        let sourceVideoFilename = sanitize(request.files.VideoUpload[0].filename);
        let videoPathName = 'uploaded/' + sourceVideoFilename + '.mp4';
        fs.renameSync('uploaded/' + sourceVideoFilename,videoPathName);

        let snapFilename = request.files.SnapUpload[0].filename;
        let snapPathName = request.files.SnapUpload[0].mimetype === 'image/jpeg' ? 'uploaded/' + snapFilename + '.jpg'
                          :request.files.SnapUpload[0].mimetype === 'image/png' ? 'uploaded/' + snapFilename + '.png'
                          : 'uploaded/' + snapFilename
        
        fs.renameSync('uploaded/' + snapFilename,snapPathName);

        // Generate sprite from source video, and add all uploaded files to IPFS
        var ipfsops = {
            videohash: (cb) => {
                fs.readFile(videoPathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            },
            snaphash: (cb) => {
                fs.readFile(snapPathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: false},(err,file) => cb(err,file[0].hash))
                })
            },
            spritehash: (cb) => {
                Shell.exec('./scripts/dtube-sprite.sh ' + videoPathName + ' uploaded/' + sourceVideoFilename + '.jpg',() => {
                    fs.readFile('uploaded/' + sourceVideoFilename + '.jpg',(err,data) => {
                        ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
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
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video480Upload) {
            ipfsops.video480hash = (cb) => {
                let video480PathName = 'uploaded/' + sourceVideoFilename + '_480.mp4'
                fs.renameSync('uploaded/' + request.files.Video480Upload[0].filename,video480PathName)
                fs.readFile(video480PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video720Upload) {
            ipfsops.video720hash = (cb) => {
                let video720PathName = 'uploaded/' + sourceVideoFilename + '_720.mp4'
                fs.renameSync('uploaded/' + request.files.Video720Upload[0].filename,video720PathName)
                fs.readFile(video720PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video1080Upload) {
            ipfsops.video1080hash = (cb) => {
                let video1080PathName = 'uploaded/' + sourceVideoFilename + '_1080.mp4'
                fs.renameSync('uploaded/' + request.files.Video1080Upload[0].filename,video1080PathName)
                fs.readFile(video1080PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        // Add everything to IPFS asynchronously
        async.parallel(ipfsops,(err,results) => {
            if (err) console.log(err)
            console.log(results);
            // Get video duration and file size
            let videoSize = request.files.VideoUpload[0].size;
            let snapSize = request.files.SnapUpload[0].size;
            if (Config.UsageLogs) fs.stat('uploaded/' + sanitize(sourceVideoFilename) + '.jpg',(err,stat) => {
                // Log usage data if no errors and if logging is enabled
                db.recordUsage(username,'videos',videoSize)
                db.recordUsage(username,'thumbnails',snapSize)

                !err ? db.recordUsage(username,'sprites',stat['size']) 
                    : console.log('Error getting sprite filesize: ' + err)

                // Log encoded video disk usage only if available
                if (results.video240hash) db.recordUsage(username,'video240',request.files.Video240Upload[0].size)
                if (results.video480hash) db.recordUsage(username,'video480',request.files.Video480Upload[0].size)
                if (results.video720hash) db.recordUsage(username,'video720',request.files.Video720Upload[0].size)
                if (results.video1080hash) db.recordUsage(username,'video1080',request.files.Video1080Upload[0].size)

                db.writeUsageData()
            });

            // Log IPFS hashes by Steem account
            // If hash is not in database, add the hash into database
            db.recordHash(username,'videos',results.videohash)
            db.recordHash(username,'thumbnails',results.snaphash)
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
    });
});

app.post('/uploadImage',(request,response) => {
    let imgType = request.query.type;
    if (!imgType) return response.send({error: 'Image upload type not specified!'})
    if (imgType != 'images' && imgType != 'thumbnails') return response.send({error: 'Invalid image upload type specified!'})

    imgUpload.single('image')(request,response,(err) => {
        if (err) return response.send({error: err})
        let username = request.body.username; //steem username
        let uploadedImg = request.file.filename;
        fs.readFile('imguploads/' + uploadedImg,(err,data) => ipfsAPI.add(data,{trickle: true},(err,file) => {
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
})

app.get('/usage', CORS(), (request,response) => {
    // API to get usage info
    if (!Config.UsageLogs) return response.send('Logs are disabled therefore API is not available for usage.');
    if (request.query.user === undefined || request.query.user === '') return response.send('Steem username is not defined!');
    db.getUsage(request.query.user,(result) => {
        response.send(result)
    })
})

app.get('/hashes', CORS(), (request,response) => {
    // API to get IPFS hashes of uploaded files
    let typerequested = request.query.hashtype;
    if (typerequested === '' || typerequested === undefined) {
        // What are you looking for???
        return response.send('hashtype not specified in GET. What are you looking for?');
    }

    typerequested.split(',');

    if (request.query.user === undefined || request.query.user === '')
        // Steem user not specified, return all hashes (either all videos, snaps or sprites, or all three)
        db.getHashes(typerequested,(obtainedHashes) => {
            return response.send(obtainedHashes);
        })
    else
        // Steem username specified does not exist in our record
        db.userExistInHashesDB(request.query.user,(result) => {
            if (!result) return response.send('Steem user specified doesn\'t exist in our record.')
            else {
                // BOTH valid Steem username and hash type request are specified
                db.getHashesByUser(typerequested,request.query.user,(obtainedHashes) => {
                    return response.send(obtainedHashes)
                })
            }
        })
});

app.get('/updatelogs',(request,response) => {
    // Send all update logs to client to be displayed on homepage
    response.send(UpdateLogs);
})

function loadWebpage(HTMLFile,response) {
    fs.readFile(HTMLFile,function(error, data) {
        if (error) {
            response.writeHead(404);
            response.write(error);
            response.end();
        } else {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(data);
            response.end();
        }
    });
}

app.use(function (req,res) {
    return res.status(404).redirect('/404');
})

if (Config.useHTTPS) {
    app.listen(Config.HTTP_PORT);
    https.createServer(credentials,app).listen(Config.HTTPS_PORT);
} else {
    app.listen(Config.HTTP_PORT);
}