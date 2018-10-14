const Multer = require('multer');
const Shell = require('shelljs');
const fs = require('fs');
const mv = require('mv');
const Config = require('./config.json');
const Express = require('express');
const app = Express();

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

app.listen(Config.port);