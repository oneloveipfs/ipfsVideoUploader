const Multer = require('multer');
const Shell = require('shelljs');
const fs = require('fs');
const Config = require('./config.json');
const Express = require('express');
const app = Express();

const upload = Multer({ dest: Config.uploadDestination });

app.use(Express.static('public'));

app.get('/', (request,response) => {
    fs.readFile('./uploader.html',function(error, data) {
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

    // Add files to IPFS
    Shell.exec('ipfs add ' + videoPathName,function(code,stdout,stderr) {
        var outs = stdout.split(' ');
        var ipfsHash = outs[1];
        Shell.exec('ipfs pin add ' + ipfsHash);
        Shell.exec('ipfs add ' + snapPathName,function(code,stdout,stderr) {
            var snapOuts = stdout.split(' ');
            var ipfsSnapHash = snapOuts[1];
            Shell.exec('ipfs pin add ' + ipfsSnapHash);
            response.end('It works?');
        });
    });
});

app.listen(Config.port);