const SteemConnect = require('steemconnect');
const Multer = require('multer');
const Shell = require('shelljs');
const getDuration = require('get-video-duration');
const fs = require('fs');
const Config = require('./config.json');
const Express = require('express');
const https = require('https');
const app = Express();

const upload = Multer({ dest: Config.uploadDestination });

// Check for invalid config
if (Config.port == NaN) {
    // Port not provided
    console.log('Please provide a valid port for app to listen to in config.json. Terminating application...');
    process.exit(1);
} else if (Config.uploadDestination == "") {
    // Upload destination not provided
    console.log('Please provide a file path where all uploaded files will be stored in config.json. Terminating application...');
    process.exit(1);
}

app.use(Express.static('public'));

app.get('/', (request,response) => {
    // Welcome page
    loadWebpage('./welcome.html',response);
});

app.get('/upload', (request,response) => {
    // Uploader page
    if (request.query.access_token != "") {
        var sc2api = SteemConnect.Initialize({ accessToken: request.query.access_token });
        sc2api.me(function(err,res) {
            if (res == null) {
                // Invalid login
                loadWebpage('./noaccesstoken.html',response);
                return;
            } else {
                let username = res.account.name;
                if (Config.whitelistEnabled == true) {
                    if (fs.existsSync('whitelist.txt')) {
                        var readList = fs.readFileSync('whitelist.txt','utf8');
                        if (!readList.includes(username)) {
                            loadWebpage('./restricted.html',response);
                            return;
                        }
                    }
                }
                loadWebpage('./uploader.html',response);
            }
        })
    }
});

var cpUpload = upload.fields([{name: 'VideoUpload', maxCount: 1},{name: 'SnapUpload', maxCount: 1}]);
app.post('/videoupload', cpUpload, function (request,response) {
    // Upload video
    // Add file extensions
    var videoPathName = request.files.VideoUpload[0].path + '.mp4';
    fs.renameSync(request.files.VideoUpload[0].path,request.files.VideoUpload[0].path + '.mp4');

    var snapPathName;
    if (request.files.SnapUpload[0].mimetype == 'image/jpeg') {
        snapPathName = request.files.SnapUpload[0].path + '.jpg';
        fs.renameSync(request.files.SnapUpload[0].path,request.files.SnapUpload[0].path + '.jpg');
    } else if (request.files.SnapUpload[0].mimetype == 'image/png') {
        snapPathName = request.files.SnapUpload[0].path + '.png';
        fs.renameSync(request.files.SnapUpload[0].path,request.files.SnapUpload[0].path + '.png');
    }
    
    var sc2token = request.body.accesstoken;
    var api = SteemConnect.Initialize({ accessToken: sc2token });
    
    // Get username
    api.me(function(err,res) {
        let username = res.account.name;

        // Add files to IPFS
        Shell.exec('ipfs add ' + videoPathName,function(code,stdout,stderr) {
            var outs = stdout.split(' ');
            var ipfsHash = outs[1];
            Shell.exec('ipfs pin add ' + ipfsHash);
            Shell.exec('ipfs add ' + snapPathName,function(code,stdout,stderr) {
                var snapOuts = stdout.split(' ');
                var ipfsSnapHash = snapOuts[1];
                Shell.exec('ipfs pin add ' + ipfsSnapHash);

                // Sprite creation
                Shell.exec('./dtube-sprite.sh ' + videoPathName + ' ' + request.files.VideoUpload[0].path + '.jpg');
                Shell.exec('ipfs add ' + request.files.VideoUpload[0].path + '.jpg',function(code,stdout,stderr) {
                    var spriteouts = stdout.split(' ');
                    var ipfsSpriteHash = spriteouts[1];
                    Shell.exec('ipfs pin add ' + ipfsSpriteHash);

                    // Get video duration and file size
                    var videoSize = request.files.VideoUpload[0].size;
                    getDuration(videoPathName).then((videoDuration) => {
                        // Post on blockchain
                        let metadata = request.body;
                        let videoPermlink = generatePermlink();
                        let transaction = generatePost(username,videoPermlink,ipfsHash,ipfsSnapHash,ipfsSpriteHash,metadata.title,metadata.description,metadata.tags,videoDuration,videoSize,request.body.powerup);
                        api.broadcast(transaction,function(err) {
                            if (err != null) {
                                response.end('Error: '+ err);
                                return;
                            }
                            console.log('It works!!! Video posted onto DTube!')
                            response.redirect('https://d.tube/v/' + username + '/' + videoPermlink);
                        });
                    });
                });
            });
        });
    });
});

function generatePermlink() {
    var permlink = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 8; i++) {
        permlink += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return permlink;
}

function buildPostBody(author,permlink,videoHash,snapHash,description) {
    return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://ipfs.io/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + description + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
}

function buildJsonMetadata(sourceHash,snapHash,spriteHash,title,description,tagString,duration,filesize,author,permlink) {
    var DTubeTags = tagString.split(' ');
    var SteemTags = DTubeTags;
    SteemTags.push('dtube');

    var jsonMeta = {
        video: {
            info: {
                title: title,
                snaphash: snapHash,
                author: author,
                permlink: permlink,
                duration: duration,
                filesize: filesize,
                spritehash: spriteHash,
            },
            content: {
                videohash: sourceHash,
                description: description,
                tags: DTubeTags,
            },
        },
        tags: SteemTags,
        app: Config.JSONApp,
    }
    return jsonMeta;
}

function generatePost(username,permlink,sourceHash,snapHash,spriteHash,title,description,tagString,duration,filesize,powerUp) {
    let tags = tagString.split(' ');

    // Power up all rewards or not
    var percentSBD = 10000;
    if (powerUp == 'on') {
        percentSBD = 0;
    }

    // Create transaction to post on Steem blockchain
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: tags[0],
                author: username,
                permlink: permlink,
                title: title,
                body: buildPostBody(username,permlink,sourceHash,snapHash,description),
                json_metadata: JSON.stringify(buildJsonMetadata(sourceHash,snapHash,spriteHash,title,description,tagString,duration,filesize,username,permlink)),
            }
        ],
        [ "comment_options", {
            author: username,
            permlink: permlink,
            max_accepted_payout: '1000000.000 SBD',
            percent_steem_dollars: percentSBD,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [
                [0, {
                    beneficiaries: [{
                        account: 'dtube',
                        weight: 1000
                    }]
                }]
            ]
        }]
    ];
    return operations;
}

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
    return res.status(404).send('Error 404 file not found');
})

if (Config.useHTTPS == true) {
    https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    },app).listen(Config.port);
} else {
    app.listen(Config.port);
}