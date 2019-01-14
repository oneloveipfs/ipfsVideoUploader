const Multer = require('multer');
const IPFS = require('ipfs-http-client');
const Shell = require('shelljs');
const getDuration = require('get-video-duration');
const fs = require('fs');
const async = require('async');
const sanitize = require('sanitize-filename');
const Config = require('./config.json');
const Express = require('express');
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
            if (!readList.includes(request.query.user)) {
                response.send({ "isInWhitelist": false });
            } else {
                response.send({ "isInWhitelist": true });
            }
        })
    }
});

app.post('/videoupload', (request,response) => {
    upload.fields([{name: 'VideoUpload', maxCount: 1},{name: 'SnapUpload', maxCount: 1}])(request,response,function(err) {
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
        var sourceVideoFilename = sanitize(request.files.VideoUpload[0].filename);
        var videoPathName = 'uploaded/' + sourceVideoFilename + '.mp4';
        fs.renameSync('uploaded/' + sourceVideoFilename,videoPathName);

        var snapFilename = request.files.SnapUpload[0].filename;
        var snapPathName;
        if (request.files.SnapUpload[0].mimetype == 'image/jpeg') {
            snapPathName = 'uploaded/' + snapFilename + '.jpg';
        } else if (request.files.SnapUpload[0].mimetype == 'image/png') {
            snapPathName = 'uploaded/' + snapFilename + '.png';
        }
        fs.renameSync('uploaded/' + snapFilename,snapPathName);

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

        async.parallel(ipfsops,(err,results) => {
            if (err) console.log(err)
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

            fs.writeFile('hashes.json',JSON.stringify(hashes),(err) => {
                if (err != null)
                    console.log('Error saving hash logs: ' + err);
            });

            getDuration(videoPathName).then((videoDuration) => {
                // Send IPFS hashes, duration and filesize back to client
                response.send({
                    ipfshash: results.videohash,
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
                if (hashes.hasOwnProperty(key)) {
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

app.use(function (req,res) {
    return res.status(404).redirect('/404');
})

if (Config.useHTTPS == true) {
    app.listen(Config.HTTP_PORT);
    https.createServer(credentials,app).listen(Config.HTTPS_PORT);
} else {
    app.listen(Config.HTTP_PORT);
}