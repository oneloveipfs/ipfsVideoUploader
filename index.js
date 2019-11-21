const Config = require('./config.json')
const UpdateLogs = require('./db/updatelogs.json')
const FileUploader = require('./ipfsUploadHandler')
const db = require('./dbManager')
const Auth = require('./authManager')
const WC = require('./wcHelper')
const WooCommerce = require('woocommerce-api')
const fs = require('fs')
const async = require('async')
const Express = require('express')
const RateLimiter = require('express-rate-limit')
const Parser = require('body-parser')
const CORS = require('cors')
const https = require('https')
const app = Express()

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
app.get('/ipfsUploadHandler.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/wcHelper.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/scripts/generateKeys.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/scripts/getLoginLink.js',(req,res) => {return res.status(404).redirect('/404')})
app.get('/whitelist.txt',(req,res) => {return res.status(404).redirect('/404')})
app.get('/config.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/db/wc.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package.json',(req,res) => {return res.status(404).redirect('/404')})
app.get('/package-lock.json',(req,res) => {return res.status(404).redirect('/404')})

// Rate limit
const AuthAPILimiter = RateLimiter({
    max: 5,
    windowMs: 60000, // 5 login attempts every 60 seconds
    message: "You have too many login attempts!",
    skipSuccessfulRequests: true
})

const VideoUploadAPILimiter = RateLimiter({
    max: 5,
    windowMs: 30000 // 5 requests every 30 seconds
})

const ImageUploadAPILimiter = RateLimiter({
    max: 10,
    windowMs: 30000 // 10 requests every 30 seconds
})

const APILimiter = RateLimiter({
    max: 1,
    windowMs: 1000 // 1 request per second
})

app.use(Express.static(__dirname, { dotfiles: 'deny' }));
app.use(CORS())

// body parser
const rawBodySaver = (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
}

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

// Setup WooCommerce
let WooCommerceAPI
if (Config.WooCommerceEnabled === true) {
    WooCommerceAPI = new WooCommerce(Config.WooCommerceConfig)
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

app.get('/checkuser', APILimiter, (request,response) => {
    // Check if user is in whitelist
    if (Config.whitelistEnabled)
        if (!Auth.whitelist().includes(request.query.user)) 
            return response.send({isInWhitelist: false})

    response.send({isInWhitelist: true})
});

app.get('/login',AuthAPILimiter,(request,response) => {
    // Steem Keychain Auth
    if ((request.query.user === undefined) || request.query.user === '')
        // Username not specified, throw an error
        return response.status(400).send({error: 'Username not specified!'})

    if (Config.whitelistEnabled)
        if (!Auth.whitelist().includes(request.query.user))
            return response.status(403).send({error: 'Looks like you do not have access to the uploader!'})

    Auth.generateEncryptedMemo(request.query.user,(err,memo) => {
        if (err) return response.send({error: err})
        response.send({encrypted_memo: memo, error: null})
    })
});

app.post('/logincb',AuthAPILimiter,(request,response) => {
    // Keychain Auth Callback
    Auth.decryptMessage(request.body,(decoded) => {
        if (Config.whitelistEnabled)
            if (!Auth.whitelist().includes(decoded[0]))
                return response.status(403).send({error: 'Looks like you do not have access to the uploader!'})

        Auth.generateJWT(decoded[0],(err,token) => {
            if (err) return response.send({error: err})
            response.send({access_token: token, error: null})
        })
    })
})

app.get('/auth',AuthAPILimiter,(request,response) => {
    let access_token = request.query.access_token
    Auth.verifyAuth(access_token,(err,res) => {
        if (err) return response.status(401).send({error: err})
        else return response.send(res)
    })
})

app.post('/uploadVideo',VideoUploadAPILimiter,(request,response) => {
    Authenticate(request,response,(user) => FileUploader.uploadVideo(user,request,response))
})

app.post('/uploadImage',ImageUploadAPILimiter,(request,response) => {
    Authenticate(request,response,(user) => FileUploader.uploadImage(user,request,response))
})

app.post('/uploadSubtitle',APILimiter,(request,response) => {
    Authenticate(request,response,(user) => FileUploader.uploadSubtitles(user,request,response))
})

app.get('/usage',APILimiter, (request,response) => {
    // API to get usage info
    if (!Config.UsageLogs) return response.send('Logs are disabled therefore API is not available for usage.');
    if (request.query.user === undefined || request.query.user === '') return response.send('Steem username is not defined!');
    db.getUsage(request.query.user,(result) => {
        response.send(result)
    })
})

app.get('/totalUsage',(request,response) => {
    let getUseOps = {}
    let possibleTypes = db.getPossibleTypes()

    for(let i = 0; i < possibleTypes.length; i++) {
        getUseOps[possibleTypes[i]] = (cb) => {
            db.getAllUsage(possibleTypes[i],(total) => {
                cb(null,total)
            })
        }
    }

    async.parallel(getUseOps,(err,result) => {
        let allUse = result
        allUse.total = 0
        for(let i = 0; i < possibleTypes.length; i++) {
            allUse.total += result[possibleTypes[i]]
        }
        response.send(allUse)
    })
})

app.get('/totalUploadCount',(request,response) => {
    // Get unique video uploads by number of source video hashes stored in db
    db.getHashes('videos',(obtainedHashes) => {
        response.send({
            count: obtainedHashes.videos.length,
            usercount: db.allUsersCount()
        })
    })
})

app.get('/hashes',APILimiter, (request,response) => {
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

app.get('/updatelogs',APILimiter,(request,response) => {
    // Send all update logs to client to be displayed on homepage
    response.send(UpdateLogs);
})

app.post('/botusage',Parser.json(),(req,res) => {
    if (!Config.WooCommerceEnabled) return res.status(404).end()
    Auth.webhookAuth(req.body.token,(err,valid) => {
        if (err || valid == false) return res.status(403).send('Failed to verify webhook.')
        res.status(200).send()
        if (WC.UserExists(req.body.username)) {
            WC.UpdateBotUsage(req.body.username,req.body.size)
            WC.WriteWCUserData()
        }
    })
})

// WooCommerce API calls
app.post('/wc_order_update',Parser.json({ verify: rawBodySaver }),Parser.urlencoded({ verify: rawBodySaver, extended: true }),Parser.raw({ verify: rawBodySaver, type: '*/*' }),(req,res) => {
    if (!Config.WooCommerceEnabled) return res.status(404).end()
    WC.VerifyWebhook(req.rawBody,req.header('X-WC-Webhook-Signature'),(isValid) => {
        if (!isValid) return res.status(403).send('Invalid webhook')

        // Send a 200 response code if webhook is legitimate
        res.status(200).send('works')

        // Check if user has paid, then process order
        // When WooCommerce detects a payment, order status updates to processing
        if (req.body.status === 'processing') {
            let getUsername = req.body.meta_data.find(user => user.key === '_billing_steem_account_name')
            let getTier = Config.WooCommerceSettings.Tiers.findIndex(tier => tier.wcpid === req.body.line_items[0].product_id)
            if (getUsername !== undefined || getUsername !== '' || getTier !== -1) {
                Auth.whitelistAdd(getUsername.value,() => {})

                // Complete order
                WooCommerceAPI.put('orders/' + req.body.id,{ status: 'completed' },() => {
                    console.log('Order ID ' + req.body.id + ' has been processed successfully!')
                })

                if (!WC.UserExists(getUsername.value)) {
                    WC.AddUser(getUsername.value,req.body.customer_id,getTier,0)

                    // Referrals
                    let getReferral = req.body.meta_data.find(refUser => refUser.key === '_billing_referral_username')
                    if (getReferral !== undefined || getReferral !== '') {
                        WC.AddReferral(getUsername.value,getReferral.value)
                    }

                    WC.WriteWCUserData()
                }
            }
        }
    })
})

app.get('/wc_user_info',APILimiter,(req,res) => {
    if (!Config.WooCommerceEnabled) return res.status(404).end()
    Authenticate(req,res,(user) => {
        WC.User(user,(err,info) => {
            if (err) res.status(400).send(err)
            return res.send(info)
        })
    })
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

function Authenticate(request,response,next) {
    let access_token = request.query.access_token
    if (Config.whitelistEnabled && !access_token) return response.status(400).send({error: 'Missing API auth credentials'})
    if (Config.whitelistEnabled && request.query.scauth === 'true') {
        // Handle SteemConnect access token
        Auth.scAuth(access_token,(err,user) => {
            if (err) return response.status(401).send({ error: err })
            else next(user)
        })
    } else {
        // Handle access token from /logincb
        Auth.verifyAuth(access_token,(err,result) => {
            if (err) return response.status(401).send({ error: err })
            else next(result.user)
        })
    }
}

app.use((req,res) => { return res.status(404).redirect('/404') })

app.listen(Config.HTTP_PORT)
if (Config.useHTTPS) https.createServer(credentials,app).listen(Config.HTTPS_PORT)