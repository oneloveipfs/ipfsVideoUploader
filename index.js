const Multer = require('multer');
const Shell = require('shelljs');
const getDuration = require('get-video-duration');
const fs = require('fs');
const sanitize = require('sanitize-filename');
const Config = require('./config.json');
const Express = require('express');
const https = require('https');
const app = Express();

const upload = Multer({ dest: './uploaded/' });

var privateKey;
var certificate;
var ca;
var credentials;

if (Config.useHTTPS == true) {
    privateKey = fs.readFileSync('/etc/letsencrypt/live/' + Config.domain + '/privkey.pem','utf8');
    certificate = fs.readFileSync('/etc/letsencrypt/live/' + Config.domain + '/cert.pem','utf8');
    ca = fs.readFileSync('/etc/letsencrypt/live/' + Config.domain + '/chain.pem','utf8');

    credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    }
}

app.use(Express.static(__dirname, { dotfiles: 'allow' }));

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

app.get('/checkuser', function(request,response) {
    // Check if user is in whitelist
    if (Config.whitelistEnabled == true) {
        if (fs.existsSync('whitelist.txt')) {
            var readList = fs.readFileSync('whitelist.txt', 'utf8');
            if (!readList.includes(request.query.user)) {
                response.send({ "isInWhitelist": false });
            } else {
                response.send({ "isInWhitelist": true });
            }
        }
    }
});

app.post('/videoupload', function(request,response) {
    upload.fields([{name: 'VideoUpload', maxCount: 1},{name: 'SnapUpload', maxCount: 1}])(request,response,function(err) {
        if (err != null) throw err;
        
        // Add video to IPFS
        var sourceVideoFilename = sanitize(request.files.VideoUpload[0].filename);
        var videoPathName = 'uploaded/' + sourceVideoFilename + '.mp4';
        fs.renameSync('uploaded/' + sourceVideoFilename,videoPathName);

        var snapFilename = sanitize(request.files.SnapUpload[0].filename);
        var snapPathName;
        if (request.files.SnapUpload[0].mimetype == 'image/jpeg') {
            snapPathName = 'uploaded/' + snapFilename + '.jpg';
        } else if (request.files.SnapUpload[0].mimetype == 'image/png') {
            snapPathName = 'uploaded/' + snapFilename + '.png';
        }
        fs.renameSync('uploaded/' + snapFilename,snapPathName);

        Shell.exec('ipfs add ' + videoPathName + ' -t',function(code,stdout,stderr) {
            var outs = stdout.split(' ');
            var ipfsHash = outs[1];
            Shell.exec('ipfs pin add ' + ipfsHash);
            Shell.exec('ipfs add ' + snapPathName,function(code,stdout,stderr) {
                var snapOuts = stdout.split(' ');
                var ipfsSnapHash = snapOuts[1];
                Shell.exec('ipfs pin add ' + ipfsSnapHash);

                // Sprite creation
                Shell.exec('./dtube-sprite.sh ' + videoPathName + ' uploaded/' + sourceVideoFilename + '.jpg');
                Shell.exec('ipfs add uploaded/' + sourceVideoFilename + '.jpg -t',function(code,stdout,stderr) {
                    var spriteouts = stdout.split(' ');
                    var ipfsSpriteHash = spriteouts[1];
                    Shell.exec('ipfs pin add ' + ipfsSpriteHash);

                    // Get video duration and file size
                    var videoSize = request.files.VideoUpload[0].size;
                    getDuration(videoPathName).then((videoDuration) => {
                        response.send({
                            ipfshash: ipfsHash,
                            snaphash: ipfsSnapHash,
                            spritehash: ipfsSpriteHash,
                            duration: videoDuration,
                            filesize: videoSize,
                            dtubefees: Config.dtubefees
                        })
                    });
                });
            });
        });
    });
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
    return res.status(404).redirect('/404.html');
})

if (Config.useHTTPS == true) {
    app.listen(Config.HTTP_PORT);
    https.createServer(credentials,app).listen(Config.HTTPS_PORT);
} else {
    app.listen(Config.HTTP_PORT);
}