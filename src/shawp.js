const Config = require('./config')
const db = require('./dbManager')
const AvalonStreamer = require('./avalonStreamer')
const GrapheneStreamer = require('./grapheneStreamer')
const coinbase = require('coinbase-commerce-node')
const fs = require('fs')
const axios = require('axios')
const Scheduler = require('node-schedule')
const dbDir = (process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs') + '/db'

db.setupDb('shawpUsers')
db.setupDb('shawpRefills')
db.setupDb('shawpConsumes')

let Customers = JSON.parse(fs.readFileSync(dbDir+'/shawpUsers.json'))
let RefillHistory = JSON.parse(fs.readFileSync(dbDir+'/shawpRefills.json'))
let ConsumeHistory = JSON.parse(fs.readFileSync(dbDir+'/shawpConsumes.json'))

let hiveStreamer = new GrapheneStreamer(Config.Shawp.HiveAPI || 'https://techcoderx.com',true)
let steemStreamer = new GrapheneStreamer(Config.Shawp.SteemAPI || 'https://api.steemit.com',true)
let avalonStreamer = new AvalonStreamer(Config.Shawp.AvalonAPI,true)

let coinbaseClient = coinbase.Client
let coinbaseCharge = coinbase.resources.Charge
let coinbaseWebhook = coinbase.Webhook
if (Config.Shawp.Coinbase)
    coinbaseClient.init(Config.CoinbaseCommerce.APIKey)

let Shawp = {
    init: () => {
        // Spawn transaction streamers
        if (!Config.Shawp.Enabled) return
        if (Config.Shawp.HiveReceiver) hiveStreamer.streamTransactions((tx) => {
            let transaction = tx
            if (transaction && transaction.operations && transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.HiveReceiver)
                Shawp.ProcessHiveTx(transaction.operations[0][1],transaction.transaction_id)
        })
        
        if (Config.Shawp.SteemReceiver) steemStreamer.streamTransactions((tx) => {
            let transaction = tx
            if (transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.SteemReceiver)
                Shawp.ProcessSteemTx(transaction.operations[0][1],transaction.transaction_id)
        })

        if (Config.Shawp.DtcReceiver) {
            avalonStreamer.streamBlocks((newBlock) => {
                for (let txn in newBlock.txs)
                    if (newBlock.txs[txn].type === 3 && newBlock.txs[txn].data.receiver === Config.Shawp.DtcReceiver) {
                        let tx = newBlock.txs[txn]
                        Shawp.ProcessAvalonTx(tx)
                    }
            })
        }

        Scheduler.scheduleJob('0 0 * * *',() => {
            Shawp.Consume()
            Shawp.WriteConsumeHistory()
            Shawp.WriteUserDB()
            console.log('Daily consumption completed successfully')
        })
    },
    FetchTx: (id,network,cb) => {
        switch (network) {
            case Shawp.methods.DTC:
                axios.get(Config.Shawp.AvalonAPI+'/tx/'+id).then(d => cb(null,d.data)).catch(e => cb(e))
                break
            case Shawp.methods.Hive:
                axios.post(Config.Shawp.HiveAPI,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'account_history_api.get_transaction',
                    params: {
                        id: id,
                        include_reversible: false
                    }
                }).then(d => {
                    if (d.data.error)
                        cb(d.data.error.message)
                    else
                        cb(null,d.data.result)
                })
                break
            case Shawp.methods.Steem:
                axios.post(Config.Shawp.SteemAPI,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'account_history_api.get_transaction',
                    params: {
                        id: id,
                        include_reversible: false
                    }
                }).then(d => {
                    if (d.data.error)
                        cb(d.data.error.message)
                    else
                        cb(null,d.data.result)
                })
                break
            default:
                cb('Invalid network')
                break
        }
    },
    ProcessAvalonTx: (tx) => {
        console.log(tx)
        let amt = tx.data.amount / 100
        Shawp.ExchangeRate(Shawp.coins.DTC,amt,(e,usd) => {
            let receiver = tx.sender
            let memo = tx.data.memo.toLowerCase().trim()
            let parsedDetails = Shawp.ValidatePayment(receiver,memo)
            if (parsedDetails.length !== 2) return
            Shawp.Refill(tx.sender,parsedDetails[0],parsedDetails[1],Shawp.methods.DTC,tx.hash,tx.ts,amt+' DTC',usd)
            Shawp.WriteRefillHistory()
            Shawp.WriteUserDB()
            console.log('Refilled $' + usd + ' to ' + (parsedDetails[1] != 'all' ? parsedDetails[1] : '') + '@' + parsedDetails[0] + ' successfully')
        })
    },
    ProcessHiveTx: (tx,txid) => {
        console.log(tx,txid)
        if (typeof tx.amount === 'object')
            tx.amount = Shawp.NaiToString(tx.amount)
        if (tx.amount.endsWith('HIVE')) {
            let amt = parseFloat(tx.amount.replace(' HIVE',''))
            Shawp.ExchangeRate(Shawp.coins.Hive,amt,(e,usd) => {
                if (e) return console.log(e)
                let receiver = tx.from
                let memo = tx.memo.toLowerCase().trim()
                let parsedDetails = Shawp.ValidatePayment(receiver,memo)
                if (parsedDetails.length !== 2) return
                Shawp.Refill(tx.from,parsedDetails[0],parsedDetails[1],Shawp.methods.Hive,txid,new Date().getTime(),tx.amount,usd)
                Shawp.WriteRefillHistory()
                Shawp.WriteUserDB()
                console.log('Refilled $' + usd + ' to ' + (parsedDetails[1] != 'all' ? parsedDetails[1] : '') + '@' + parsedDetails[0] + ' successfully')
            })
        } else if (tx.amount.endsWith('HBD')) {
            let amt = parseFloat(tx.amount.replace(' HBD',''))
            Shawp.ExchangeRate(Shawp.coins.HiveDollars,amt,(e,usd) => {
                if (e) return console.log(e)
                let receiver = tx.from
                let memo = tx.memo.toLowerCase().trim()
                let parsedDetails = Shawp.ValidatePayment(receiver,memo)
                if (parsedDetails.length !== 2) return
                Shawp.Refill(tx.from,parsedDetails[0],parsedDetails[1],Shawp.methods.Hive,txid,new Date().getTime(),tx.amount,usd)
                Shawp.WriteRefillHistory()
                Shawp.WriteUserDB()
                console.log('Refilled $' + usd + ' to ' + (parsedDetails[1] != 'all' ? parsedDetails[1] : '') + '@' + parsedDetails[0] + ' successfully')
            })
        }
    },
    ProcessSteemTx: (tx,txid) => {
        console.log(tx,txid)
        if (tx.amount.endsWith('STEEM')) {
            let amt = parseFloat(tx.amount.replace(' STEEM',''))
            Shawp.ExchangeRate(Shawp.coins.Steem,amt,(e,usd) => {
                if (e) return console.log(e)
                let receiver = tx.from
                let memo = tx.memo.toLowerCase().trim()
                let parsedDetails = Shawp.ValidatePayment(receiver,memo)
                if (parsedDetails.length !== 2) return
                Shawp.Refill(tx.from,parsedDetails[0],parsedDetails[1],Shawp.methods.Steem,txid,new Date().getTime(),tx.amount,usd)
                Shawp.WriteRefillHistory()
                Shawp.WriteUserDB()
                console.log('Refilled $' + usd + ' to ' + (parsedDetails[1] != 'all' ? parsedDetails[1] : '') + '@' + parsedDetails[0] + ' successfully')
            })
        } else if (tx.amount.endsWith('SBD')) {
            let amt = parseFloat(tx.amount.replace(' SBD',''))
            Shawp.ExchangeRate(Shawp.coins.SteemDollars,amt,(e,usd) => {
                if (e) return console.log(e)
                let receiver = tx.from
                let memo = tx.memo.toLowerCase().trim()
                let parsedDetails = Shawp.ValidatePayment(receiver,memo)
                if (parsedDetails.length !== 2) return
                Shawp.Refill(tx.from,parsedDetails[0],parsedDetails[1],Shawp.methods.Steem,txid,new Date().getTime(),tx.amount,usd)
                Shawp.WriteRefillHistory()
                Shawp.WriteUserDB()
                console.log('Refilled $' + usd + ' to ' + (parsedDetails[1] != 'all' ? parsedDetails[1] : '') + '@' + parsedDetails[0] + ' successfully')
            })
        }
    },
    NaiToString: (nai) => {
        let result = (parseInt(nai.amount) / Math.pow(10,nai.precision)).toString() + ' '
        if (nai.nai === '@@000000021')
            result += 'HIVE'
        else if (nai.nai === '@@000000013')
            result += 'HBD'
        return result
    },
    ValidatePayment: (receiver,memo) => {
        let network = 'all'
        if (memo !== '' && !memo.startsWith('to: @') && !memo.startsWith('to: hive@') && !memo.startsWith('to: dtc@')) return [] // Memo must be empty or begin with "to: @" or "to: network@"
        if (memo && memo.startsWith('to: @')) {
            let otheruser = memo.replace('to: @','')
            if (require('./authManager').invalidHiveUsername(otheruser) == null && db.isValidAvalonUsername(otheruser) == null) receiver = otheruser
        } else if (memo && memo.startsWith('to: hive@')) {
            let otheruser = memo.replace('to: hive@','')
            if (require('./authManager').invalidHiveUsername(otheruser) == null) receiver = otheruser
            network = 'hive'
        } else if (memo && memo.startsWith('to: dtc@')) {
            let otheruser = memo.replace('to: dtc@','')
            if (db.isValidAvalonUsername(otheruser) == null) receiver = otheruser
            network = 'dtc'
        }
        return [receiver,network]
    },
    AddUser: (username,network,nowrite) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (Customers[fullusername]) return
        Customers[fullusername] = {
            rate: Config.Shawp.DefaultUSDRate,
            balance: 0,
            joinedSince: new Date().getTime()
        }
        require('./authManager').whitelistAdd(username,network,() => {},nowrite)
    },
    User: (username,network) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!Customers[fullusername]) return {}
        let totalusage = db.getTotalUsage(username,network)
        let res = JSON.parse(JSON.stringify(Customers[fullusername]))
        res.usage = totalusage
        let daysRemaining = Shawp.getDaysRemaining(username,network)
        res.daysremaining = daysRemaining.days
        if (daysRemaining.needs) res.needs = daysRemaining.needs

        // Usage breakdown
        res.usagedetails = db.getUsage(username,network)

        return res
    },
    UserExists: (username,network) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!Customers[fullusername]) return false
        else return true
    },
    AllUsers: () => {
        return Object.keys(Customers)
    },
    ExchangeRate: (coin,amount,cb) => {
        let coingeckoUrl
        switch (coin) {
            case 0:
                coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/dtube-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
                break
            case 1:
                coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
                break
            case 2:
                coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
                break
            case 3:
                coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
                break
            case 4:
                coingeckoUrl = 'https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
                break
            default:
                return cb({ error: 'invalid coin' })
        }
        axios.get(coingeckoUrl).then((response) => {
            cb(null,response.data.market_data.current_price.usd * amount)
        }).catch((e) => cb(e))
    },
    CoinbaseCharge: (username,network,usdAmt,cb,cbUrl,cancelUrl) => {
        let chargeData = {
            name: Config.CoinbaseCommerce.ProductName,
            description: 'Account refill for @' + username,
            metadata: {
                customer_username: username,
                network: network
            },
            pricing_type: 'fixed_price',
            local_price: {
                amount: usdAmt,
                currency: 'USD'
            },
            redirect_url: cbUrl || Config.CoinbaseCommerce.RedirectURL,
            cancel_url: cancelUrl || Config.CoinbaseCommerce.CancelURL
        }

        coinbaseCharge.create(chargeData,(e,response) => {
            console.log(e,response)
            if (e)
                return cb(e)
            else
                return cb(null,response)
        })
    },
    CoinbaseWebhookVerify: (request,cb) => {
        try {
            coinbaseWebhook.verifySigHeader(request.rawBody,request.headers['x-cc-webhook-signature'],Config.CoinbaseCommerce.WebhookSecret)
            cb(true)
        } catch {
            cb(false)
        }
    },
    Refill: (from,username,network,method,txid,ts,rawAmt,usdAmt) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!Customers[fullusername]) Shawp.AddUser(username,network)

        let newCredits = Math.floor(usdAmt / Customers[fullusername].rate * 100000000) / 100000000
        Customers[fullusername].balance += newCredits

        if (!RefillHistory[fullusername])
            RefillHistory[fullusername] = []
        
        RefillHistory[fullusername].unshift({
            from: from,
            method: method,
            rawAmt: rawAmt,
            usdAmt: usdAmt,
            credits: newCredits,
            ts: ts,
            txid: txid
        })
    },
    Consume: () => {
        let datetoday = new Date()
        let daynow = datetoday.getDate()
        let monthnow = datetoday.getMonth()
        let yearnow = datetoday.getFullYear()
        for (user in Customers) {
            let usage = db.getTotalUsage(db.toUsername(user),db.toNetwork(user))
            let gbdays = Math.round(usage / 1073741824 * 100000000) / 100000000
            Customers[user].balance -= gbdays

            if (!ConsumeHistory[user]) ConsumeHistory[user] = []
            if (gbdays > 0) ConsumeHistory[user].unshift([daynow + '/' + monthnow + '/' + yearnow,gbdays])
        }
    },
    getRefillHistory: (username,network,start,count) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!RefillHistory[fullusername]) return []
        return RefillHistory[fullusername].slice(start,start+count)
    },
    getConsumeHistory: (username,network,start,count) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!ConsumeHistory[fullusername]) return []
        return ConsumeHistory[fullusername].slice(start,start+count)
    },
    getDaysRemaining: (username,network) => {
        let fullusername = db.toFullUsername(username,network,true)
        let usage = db.getTotalUsage(username,network)
        if (usage <= 0 || !Customers[fullusername])
            return { days: -1 }
        else if (Customers[fullusername].balance <= 0 && !Config.admins.includes(username))
            return { days: 0, needs: usage/1073741824 - Customers[fullusername].balance }
        let days = Math.floor(Customers[fullusername].balance / usage * 1073741824)
        if (days == 0 && !Config.admins.includes(username))
            return { days: days, needs: usage/1073741824 - Customers[fullusername].balance }
        else if (days == 0 && Config.admins.includes(username))
            return { days: -2 }
        else
            return { days: days }
    },
    setRate: (username,network,usdRate) => {
        let fullusername = db.toFullUsername(username,network,true)
        if (!Customers[fullusername]) return
        Customers[fullusername].rate = usdRate
    },
    WriteUserDB: () => {
        fs.writeFile(dbDir+'/shawpUsers.json',JSON.stringify(Customers),(e) => {
            if (e) console.log('Error saving user database: ' + err)
        })
    },
    WriteRefillHistory: () => {
        fs.writeFile(dbDir+'/shawpRefills.json',JSON.stringify(RefillHistory),(e) => {
            if (e) console.log('Error saving refill database: ' + err)
        })
    },
    WriteConsumeHistory: () => {
        fs.writeFile(dbDir+'/shawpConsumes.json',JSON.stringify(ConsumeHistory),(e) => {
            if (e) console.log('Error saving refill database: ' + err)
        })
    },
    coins: {
        // Native
        DTC: 0,
        Hive: 1,
        HiveDollars: 2,
        Steem: 3,
        SteemDollars: 4,

        // Coinbase commerce
        // TODO: Add support for running own node. Not your node, not your rules.
        BTC: 5,
        ETH: 6,
        LTC: 7,
        BCH: 8,
        DAI: 9,
        USDC: 10
    },
    methods: {
        DTC: 0,
        Hive: 1,
        Steem: 2,
        Coupon: 3, // through promo/wc orders
        Referral: 4, // not sure
        System: 5,
        Coinbase: 6
    },
    steemStreamer,
    hiveStreamer,
    avalonStreamer
}

module.exports = Shawp