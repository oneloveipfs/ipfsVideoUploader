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

app.use(Express.static(__dirname));

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

        Shell.exec('ipfs add ' + videoPathName + ' -t',function(code,stdout,stderr) {
            var outs = stdout.split(' ');
            var ipfsHash = outs[1];
            Shell.exec('ipfs pin add ' + ipfsHash);
            Shell.exec('ipfs add ' + snapPathName,function(code,stdout,stderr) {
                var snapOuts = stdout.split(' ');
                var ipfsSnapHash = snapOuts[1];
                Shell.exec('ipfs pin add ' + ipfsSnapHash);

                // Sprite creation
                Shell.exec('./dtube-sprite.sh ' + videoPathName + ' ' + request.files.VideoUpload[0].path + '.jpg');
                Shell.exec('ipfs add ' + request.files.VideoUpload[0].path + '.jpg -t',function(code,stdout,stderr) {
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
                            filesize: videoSize
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
    return res.status(404).send('Error 404 file not found');
})

if (Config.useHTTPS == true) {
    app.listen(Config.port);
} else {
    app.listen(Config.port);
}