const Multer = require('multer');
const IPFS = require('ipfs-http-client');
const Shell = require('shelljs');
const getDuration = require('get-video-duration');
const fs = require('fs');
const async = require('async');
const Crypto = require('crypto-js')
const JWT = require('jsonwebtoken');
const Steem = require('steem');
const sanitize = require('sanitize-filename');
const Config = require('./config.json');
const Keys = require('./.auth.json');
const Express = require('express');
const Parser = require('body-parser');
const CORS = require('cors');
const https = require('https');
const app = Express();

const ipfsAPI = IPFS('localhost',5001,{protocol: 'http'})
const upload = Multer({ dest: './uploaded/' });
const imgUpload = Multer({ dest: './imguploads/', limits: { fileSize: 7340032 } })

// Cache usage data in a variable
var usageData = {};
if (Config.UsageLogs == true) {
    usageData = JSON.parse(fs.readFileSync('usage.json','utf8'));
}

// Cache hashes data in a variable
var hashes = JSON.parse(fs.readFileSync('hashes.json','utf8'));

// Setup HTTPS if needed
var privateKey;
var certificate;
var ca;
var credentials;

if (Config.useHTTPS == true) {
    privateKey = fs.readFileSync(Config.HTTPS_PrivKey_Dir,'utf8');
    certificate = fs.readFileSync(Config.HTTPS_Cert_Dir,'utf8');
    ca = fs.readFileSync(Config.HTTPS_CertAuth_Dir,'utf8');

    credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    }
}

app.use(Express.static(__dirname, { dotfiles: 'deny' }));
app.use(Parser.text())

// HTTP to HTTPS redirect
if (Config.useHTTPS == true) {
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
    if (Config.whitelistEnabled == true && fs.existsSync('whitelist.txt')) {
        fs.readFile('whitelist.txt', 'utf8',(err,readList) => {
            let whitelistedUsers = readList.split('\n')
            if (!whitelistedUsers.includes(request.query.user)) {
                response.send({isInWhitelist: false})
            } else {
                response.send({isInWhitelist: true})
            }
        })
    } else {
        response.send({isInWhitelist: true})
    }
});

app.get('/login',(request,response) => {
    // Steem Keychain Auth
    if ((request.query.user == null || undefined) || request.query.user == '') {
        // Username not specified, throw an error
        response.send({error: 'Username not specified!'})
        return
    }
    if (Config.whitelistEnabled == true && fs.existsSync('whitelist.txt')) {
        fs.readFile('whitelist.txt', 'utf8',(err,readList) => {
            let whitelistedUsers = readList.split('\n')
            if (!whitelistedUsers.includes(request.query.user)) {
                response.send({error: 'Looks like you do not have access to the uploader!'})
            } else {
                generateEncryptedMemo(request.query.user,response)
            }
        })
    } else {
        generateEncryptedMemo(request.query.user,response)
    }
});

app.post('/logincb',(request,response) => {
    // Keychain Auth Callback
    let decoded = Crypto.AES.decrypt(request.body,Keys.AESKey).toString(Crypto.enc.Utf8).split(':')
    if (Config.whitelistEnabled == true && fs.existsSync('whitelist.txt')) {
        fs.readFile('whitelist.txt', 'utf8',(err,readList) => {
            let whitelistedUsers = readList.split('\n')
            if (!whitelistedUsers.includes(decoded[0])) {
                response.send({error: 'Looks like you do not have access to the uploader!'})
            } else {
                generateJWT(decoded,response)
            }
        })
    } else {
        generateJWT(decoded,response)
    }
})

app.post('/videoupload', (request,response) => {
    upload.fields([
        {name: 'VideoUpload', maxCount: 1},
        {name: 'SnapUpload', maxCount: 1},
        {name: 'Video240Upload', maxCount: 1},
        {name: 'Video480Upload', maxCount: 1},
        {name: 'Video720Upload', maxCount: 1},
        {name: 'Video1080Upload', maxCount: 1},
    ])(request,response,function(err) {
        request.socket.setTimeout(0)
        if (err != null) throw err;

        let username = request.body.Username; //steem username
        if (Config.UsageLogs == true) {
            if (typeof username != 'string') {
                throw "Username submitted to upload server is not a string!"
            } else if ((username == undefined || null) || (username == '')) {
                throw "We can't process your upload because our server doesn't know who you are!"
            }
        }

        // Add video to IPFS
        let sourceVideoFilename = sanitize(request.files.VideoUpload[0].filename);
        let videoPathName = 'uploaded/' + sourceVideoFilename + '.mp4';
        fs.renameSync('uploaded/' + sourceVideoFilename,videoPathName);

        let snapFilename = request.files.SnapUpload[0].filename;
        var snapPathName;
        if (request.files.SnapUpload[0].mimetype == 'image/jpeg') {
            snapPathName = 'uploaded/' + snapFilename + '.jpg';
        } else if (request.files.SnapUpload[0].mimetype == 'image/png') {
            snapPathName = 'uploaded/' + snapFilename + '.png';
        }
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
                Shell.exec('./dtube-sprite.sh ' + videoPathName + ' uploaded/' + sourceVideoFilename + '.jpg',() => {
                    fs.readFile('uploaded/' + sourceVideoFilename + '.jpg',(err,data) => {
                        ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                    })
                })
            }
        }

        // Add encoded versions to IPFS as well if available
        if (request.files.Video240Upload != undefined) {
            ipfsops.video240hash = (cb) => {
                let video240PathName = 'uploaded/' + sourceVideoFilename + '_240.mp4'
                fs.renameSync('uploaded/' + request.files.Video240Upload[0].filename,video240PathName)
                fs.readFile(video240PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video480Upload != undefined) {
            ipfsops.video480hash = (cb) => {
                let video480PathName = 'uploaded/' + sourceVideoFilename + '_480.mp4'
                fs.renameSync('uploaded/' + request.files.Video480Upload[0].filename,video480PathName)
                fs.readFile(video480PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video720Upload != undefined) {
            ipfsops.video720hash = (cb) => {
                let video720PathName = 'uploaded/' + sourceVideoFilename + '_720.mp4'
                fs.renameSync('uploaded/' + request.files.Video720Upload[0].filename,video720PathName)
                fs.readFile(video720PathName,(err,data) => {
                    ipfsAPI.add(data,{trickle: true},(err,file) => cb(err,file[0].hash))
                })
            }
        }

        if (request.files.Video1080Upload != undefined) {
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
            fs.stat('uploaded/' + sanitize(sourceVideoFilename) + '.jpg',(err,stat) => {
                if (Config.UsageLogs == true) {
                    // Log usage data if no errors and if logging is enabled
                    if (usageData[username] == undefined) {
                        // New user?
                        usageData[username] = {};
                    }

                    var videoUsage = usageData[username]['videos'];
                    if (videoUsage == undefined) {
                        usageData[username]['videos'] = videoSize;
                    } else {
                        usageData[username]['videos'] = videoUsage + videoSize;
                    }

                    var snapUsage = usageData[username]['thumbnails'];
                    if (snapUsage == undefined) {
                        usageData[username]['thumbnails'] = snapSize;
                    } else {
                        usageData[username]['thumbnails'] = snapUsage + snapSize;
                    }

                    if (err != null) {
                        console.log('Error getting sprite filesize: ' + err);
                    } else {
                        var spriteUsage = usageData[username]['sprites'];
                        if (spriteUsage == undefined) {
                            usageData[username]['sprites'] = stat['size'];
                        } else {
                            usageData[username]['sprites'] = spriteUsage + stat['size'];
                        }
                    }

                    // Log encoded video disk usage only if available
                    if (results.video240hash != undefined) {
                        var video240Usage = usageData[username]['video240']
                        if (video240Usage == undefined)
                            usageData[username]['video240'] = request.files.Video240Upload[0].size
                        else
                            usageData[username]['video240'] = video240Usage + request.files.Video240Upload[0].size
                    }

                    if (results.video480hash != undefined) {
                        var video480Usage = usageData[username]['video480']
                        if (video480Usage == undefined)
                            usageData[username]['video480'] = request.files.Video480Upload[0].size
                        else
                            usageData[username]['video480'] = video480Usage + request.files.Video480Upload[0].size
                    }

                    if (results.video720hash != undefined) {
                        var video720Usage = usageData[username]['video720']
                        if (video720Usage == undefined)
                            usageData[username]['video720'] = request.files.Video720Upload[0].size
                        else
                            usageData[username]['video720'] = video720Usage + request.files.Video720Upload[0].size
                    }

                    if (results.video1080hash != undefined) {
                        var video1080Usage = usageData[username]['video1080']
                        if (video1080Usage == undefined)
                            usageData[username]['video1080'] = request.files.Video1080Upload[0].size
                        else
                            usageData[username]['video1080'] = video1080Usage + request.files.Video1080Upload[0].size
                    }

                    fs.writeFile('usage.json',JSON.stringify(usageData),() => {});
                }
            });

            // Log IPFS hashes by Steem account
            if (hashes[username] == undefined) {
                hashes[username] = {
                    videos: [],
                    thumbnails: [],
                    sprites: [],
                    images: [],
                }
            }
            
            // If hash is not in database, add the hash into database
            if (!hashes[username]['videos'].includes(results.videohash))
                hashes[username]['videos'].push(results.videohash)
            if (!hashes[username]['thumbnails'].includes(results.snaphash))
                hashes[username]['thumbnails'].push(results.snaphash)
            if (!hashes[username]['sprites'].includes(results.spritehash))
                hashes[username]['sprites'].push(results.spritehash)

            // Add encoded video hashes into database if available
            if (results.video240hash != undefined) {
                if (hashes[username].video240 == undefined) {
                    hashes[username].video240 = [results.video240hash]
                } else {
                    if (!hashes[username]['video240'].includes(results.video240hash))
                        hashes[username]['video240'].push(results.video240hash)
                }
            }

            if (results.video480hash != undefined) {
                if (hashes[username].video480 == undefined) {
                    hashes[username].video480 = [results.video480hash]
                } else {
                    if (!hashes[username]['video480'].includes(results.video480hash))
                        hashes[username]['video480'].push(results.video480hash)
                }
            }

            if (results.video720hash != undefined) {
                if (hashes[username].video720 == undefined) {
                    hashes[username].video720 = [results.video720hash]
                } else {
                    if (!hashes[username]['video720'].includes(results.video720hash))
                        hashes[username]['video720'].push(results.video720hash)
                }
            }

            if (results.video1080hash != undefined) {
                if (hashes[username].video1080 == undefined) {
                    hashes[username].video1080 = [results.video240hash]
                } else {
                    if (!hashes[username]['video1080'].includes(results.video1080hash))
                        hashes[username]['video1080'].push(results.video1080hash)
                }
            }

            fs.writeFile('hashes.json',JSON.stringify(hashes),(err) => {
                if (err != null)
                    console.log('Error saving hash logs: ' + err);
            });

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

app.post('/imageupload',imgUpload.single('postImg'),(request,response) => {
    let username = request.body.username; //steem username
    if (Config.UsageLogs == true) {
        if (typeof username != 'string') {
            throw "Username submitted to upload server is not a string!"
        } else if ((username == undefined || null) || (username == '')) {
            throw "We can't process your upload because our server doesn't know who you are!"
        }
    }
    let uploadedImg = request.file.filename;
    fs.readFile('imguploads/' + uploadedImg,(err,data) => ipfsAPI.add(data,{trickle: true},(err,file) => {
        if (Config.UsageLogs == true) {
            // Log usage data for image uploads
            if (usageData[username] == undefined) {
                // New user?
                usageData[username] = {};
            }

            var imgUsage = usageData[username]['images'];
            if (imgUsage == undefined) {
                usageData[username]['images'] = request.file.size;
            } else {
                usageData[username]['images'] = imgUsage + request.file.size;
            }

            fs.writeFile('usage.json',JSON.stringify(usageData),() => {});
        }

        // Log IPFS hashes by Steem account
        if (hashes[username] == undefined) {
            hashes[username] = {
                videos: [],
                thumbnails: [],
                sprites: [],
                images: [],
            }
        }

        // Patch for empty images array
        if (hashes[username].images == undefined) {
            hashes[username].images = [];
        }

        // If hash is not in database, add the hash into database
        if (!hashes[username]['images'].includes(file[0].hash))
            hashes[username]['images'].push(file[0].hash);
        
        fs.writeFile('hashes.json',JSON.stringify(hashes),(err) => {
            if (err != null)
                console.log('Error saving image hash logs: ' + err);
        });

        // Send image IPFS hash back to client
        response.send({
            imghash: file[0].hash
        })
    }))
})

app.get('/usage', CORS(), (request,response) => {
    // API to get usage info
    if (Config.UsageLogs != true) return response.send('Logs are disabled therefore API is not available for usage.');
    if (request.query.user == undefined || request.query.user == '') return response.send('Steem username is not defined!');
    response.send(usageData[request.query.user]);
})

app.get('/hashes', CORS(), (request,response) => {
    // API to get IPFS hashes of uploaded files
    let typerequested = request.query.hashtype;
    if (typerequested == '' || typerequested == undefined) {
        // What are you looking for???
        return response.send('hashtype not specified in GET. What are you looking for?');
    }

    typerequested.split(',');

    var hashesToReturn = {};
    if (request.query.user == undefined || request.query.user == '') {
        // Steem user not specified, return all hashes (either all videos, snaps or sprites, or all three)
        function getAllHashes(hashType) {
            var hashArrToReturn = [];
            for(var key in hashes) {
                if (hashes.hasOwnProperty(key) && hashes[key][hashType] != undefined) {
                    hashArrToReturn = hashArrToReturn.concat(hashes[key][hashType]);
                }
            }
            return hashArrToReturn;
        }
        if (typerequested.includes('videos'))
            hashesToReturn.videos = getAllHashes('videos');
        if (typerequested.includes('thumbnails'))
            hashesToReturn.thumbnails = getAllHashes('thumbnails');
        if (typerequested.includes('sprites'))
            hashesToReturn.sprites = getAllHashes('sprites');
        if (typerequested.includes('images'))
            hashesToReturn.images = getAllHashes('images');
        if (typerequested.includes('video240'))
            hashesToReturn.video240 = getAllHashes('video240')
        if (typerequested.includes('video480'))
            hashesToReturn.video480 = getAllHashes('video480')
        if (typerequested.includes('video720'))
            hashesToReturn.video720 = getAllHashes('video720')
        if (typerequested.includes('video1080'))
            hashesToReturn.video1080 = getAllHashes('video1080')
        
        return response.send(hashesToReturn);
    }

    // Steem username specified does not exist in our record
    if (!hashes.hasOwnProperty(request.query.user)) {
        return response.send('Steem user specified doesn\'t exist in our record.');
    }

    // BOTH valid Steem username and hash type request are specified
    if (typerequested.includes('videos'))
        hashesToReturn.videos = hashes[request.query.user]['videos'];
    if (typerequested.includes('thumbnails'))
        hashesToReturn.thumbnails = hashes[request.query.user]['thumbnails'];
    if (typerequested.includes('sprites'))
        hashesToReturn.sprites = hashes[request.query.user]['sprites'];
    if (typerequested.includes('images'))
        hashesToReturn.images = hashes[request.query.user]['images'];
    if (typerequested.includes('video240'))
        hashesToReturn.video240 = hashes[request.query.user]['video240'];
    if (typerequested.includes('video480'))
        hashesToReturn.video480 = hashes[request.query.user]['video480'];
    if (typerequested.includes('video720'))
        hashesToReturn.video720 = hashes[request.query.user]['video720'];
    if (typerequested.includes('video1080'))
        hashesToReturn.video1080 = hashes[request.query.user]['video1080'];
    
    return response.send(hashesToReturn);
});

function loadWebpage(HTMLFile,response) {
    fs.readFile(HTMLFile,function(error, data) {
        if (error != null) {
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

function generateEncryptedMemo(username,response) {
    // Generate encrypted text to be decrypted by Keychain on client
    let encrypted_message = Crypto.AES.encrypt(username + ':oneloveipfs_login_' + Date.now(),Keys.AESKey).toString()
    Steem.api.getAccounts([username],(err,res) => {
        let encrypted_memo = Steem.memo.encode(Keys.wifMessage,res[0].posting.key_auths[0][0],'#' + encrypted_message)
        response.send({encrypted_memo: encrypted_memo, error: null})
    })
}

function generateJWT(data,response) {
    // Generate access token to be sent as response
    JWT.sign({
        user: data[0],
        app: 'oneloveipfs',
        iat: data[1].split('_')[2] / 1000,
        exp: (data[1].split('_')[2] / 1000) + 604800
    },Keys.JWTKey,(err,token) => {
        if (err != null) {
            console.log('Error signing JWT: ' + err)
            response.send({error: 'Error generating access token: ' + err})
        } else {
            response.send({access_token: token, error: null})
        }
    })
}

app.use(function (req,res) {
    return res.status(404).redirect('/404');
})

if (Config.useHTTPS == true) {
    app.listen(Config.HTTP_PORT);
    https.createServer(credentials,app).listen(Config.HTTPS_PORT);
} else {
    app.listen(Config.HTTP_PORT);
}