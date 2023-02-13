const Config = require('./config')
const fs = require('fs')
const axios = require('axios')
const Express = require('express')
const Proxy = require('http-proxy')
const CORS = require('cors')
const app = Express()
const http = require('http').createServer(app)
const ProxyConfig = { changeOrigin: true, target: Config.upstream }
const ProxyAPI = Proxy.createProxyServer(ProxyConfig)

app.use(Express.static(__dirname+'/..', { dotfiles: 'deny' }));
app.use(CORS())

// Webpages
app.get('/', (request,response) => loadWebpage(__dirname+'/../client/welcome.html',response)) // Home page
app.get('/upload', (request,response) => loadWebpage(__dirname+'/../client/uploader.html',response)) // Upload page
app.get('/404', (request,response) => loadWebpage(__dirname+'/../client/404.html',response)) // 404 page
app.get('/proxy_server',(req,res) => res.send({server: Config.upstream}))
app.get('/config', (req,res) => {
    axios.get(Config.upstream+'/config').then(upstreamRes => {
        upstreamRes.data.encoder = Config.Encoder
        upstreamRes.data.isRemote = true
        res.send(upstreamRes.data)
    }).catch(() => res.status(503).send({error: 'failed to fetch config from upstream server'}))
})

// Redirect all other APIs
app.use((req,res) => ProxyAPI.web(req,res,ProxyConfig))

function loadWebpage(HTMLFile,response) {
    fs.readFile(HTMLFile,function(error, data) {
        if (error) {
            response.writeHead(404)
            response.write(error.toString())
            response.end()
        } else {
            response.writeHead(200, {'Content-Type': 'text/html'})
            response.write(data)
            response.end()
        }
    });
}

http.listen(Config.HTTP_PORT,Config.HTTP_BIND_IP)