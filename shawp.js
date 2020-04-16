const Config = require('./config.json')
const db = require('./dbManager')
const hive = require('@hiveio/hive-js')
const steem = require('steem')
const fs = require('fs')
const axios = require('axios')
const Scheduler = require('node-schedule')
  
hive.api.setOptions({url: Config.Shawp.HiveAPI, useAppbaseApi: true })
steem.api.setOptions({ url: Config.Shawp.SteemAPI, useAppbaseApi: true })

let Customers = JSON.parse(fs.readFileSync('db/shawp/users.json'))
let RefillHistory = JSON.parse(fs.readFileSync('db/shawp/refills.json'))
let ConsumeHistory = JSON.parse(fs.readFileSync('db/shawp/consumes.json'))

let Shawp = {
    init: () => {
        // Stream transactions from blockchain
        if (!Config.Shawp.Enabled) return
        if (Config.Shawp.HiveReceiver) hive.api.streamTransactions((err,tx) => {
            if (err) return console.log('Hive tx stream error',err)
            let transaction = tx
            if (transaction && transaction.operations && transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.HiveReceiver) {
                let tx = transaction.operations[0][1]
                console.log(tx)
                if (tx.amount.endsWith('HIVE')) {
                    let amt = parseFloat(tx.amount.replace(' HIVE',''))
                    Shawp.ExchangeRate(Shawp.coins.Hive,amt,(e,usd) => {
                        if (e) return console.log(e)
                        let receiver = tx.from
                        let memo = tx.memo.toLowerCase()
                        if (memo && memo.startsWith('to: @')) {
                            let otheruser = memo.replace('to: @','')
                            if (hive.utils.validateAccountName(otheruser) == null) receiver = otheruser
                        }
                        Shawp.Refill(tx.from,receiver,Shawp.methods.Hive,tx.amount,usd)
                        Shawp.WriteRefillHistory()
                        Shawp.WriteUserDB()
                        console.log('Refilled $' + usd + ' to @' + receiver + ' successfully')
                    })
                } else if (tx.amount.endsWith('HBD')) {
                    let amt = parseFloat(tx.amount.replace(' HBD',''))
                    Shawp.ExchangeRate(Shawp.coins.HiveDollars,amt,(e,usd) => {
                        if (e) return console.log(e)
                        let receiver = tx.from
                        let memo = tx.memo.toLowerCase()
                        if (memo && memo.startsWith('to: @')) {
                            let otheruser = memo.replace('to: @','')
                            if (hive.utils.validateAccountName(otheruser) == null) receiver = otheruser
                        }
                        Shawp.Refill(tx.from,tx.from,Shawp.methods.Hive,tx.amount,usd)
                        Shawp.WriteRefillHistory()
                        Shawp.WriteUserDB()
                        console.log('Refilled $' + usd + ' to @' + receiver + ' successfully')
                    })
                }
            }
        })
        
        if (Config.Shawp.SteemReceiver) steem.api.streamTransactions((err,tx) => {
            if (err) return console.log('Steem tx stream error',err)
            let transaction = tx
            if (transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.SteemReceiver) {
                let tx = transaction.operations[0][1]
                if (tx.amount.endsWith('STEEM')) {
                    let amt = parseFloat(tx.amount.replace(' STEEM',''))
                    Shawp.ExchangeRate(Shawp.coins.Steem,amt,(e,usd) => {
                        if (e) return console.log(e)
                        let receiver = tx.from
                        let memo = tx.memo.toLowerCase()
                        if (memo && memo.startsWith('to: @')) {
                            let otheruser = memo.replace('to: @','')
                            if (steem.utils.validateAccountName(otheruser) == null) receiver = otheruser
                        }
                        Shawp.Refill(tx.from,tx.from,Shawp.methods.Steem,tx.amount,usd)
                        Shawp.WriteRefillHistory()
                        Shawp.WriteUserDB()
                        console.log('Refilled $' + usd + ' to @' + receiver + ' successfully')
                    })
                } else if (tx.amount.endsWith('SBD')) {
                    let amt = parseFloat(tx.amount.replace(' SBD',''))
                    Shawp.ExchangeRate(Shawp.coins.SteemDollars,amt,(e,usd) => {
                        if (e) return console.log(e)
                        let receiver = tx.from
                        let memo = tx.memo.toLowerCase()
                        if (memo && memo.startsWith('to: @')) {
                            let otheruser = memo.replace('to: @','')
                            if (steem.utils.validateAccountName(otheruser) == null) receiver = otheruser
                        }
                        Shawp.Refill(tx.from,tx.from,Shawp.methods.Steem,tx.amount,usd)
                        Shawp.WriteRefillHistory()
                        Shawp.WriteUserDB()
                        console.log('Refilled $' + usd + ' to @' + receiver + ' successfully')
                    })
                }
            }
        })

        Scheduler.scheduleJob('0 0 * * *',() => {
            Shawp.Consume()
            Shawp.WriteConsumeHistory()
            Shawp.WriteUserDB()
            console.log('Daily consumption completed successfully')
        })
    },
    AddUser: (username) => {
        if (Customers[username]) return
        Customers[username] = {
            rate: Config.Shawp.DefaultUSDRate,
            balance: 0,
            joinedSince: new Date().getTime()
        }
        require('./authManager').whitelistAdd(username,() => {})
    },
    User: (username) => {
        if (!Customers[username]) return {}
        let totalusage = db.getTotalUsage(username)
        let res = JSON.parse(JSON.stringify(Customers[username]))
        res.usage = totalusage
        return res
    },
    UserExists: (username) => {
        if (!Customers[username]) return false
        else return true
    },
    ExchangeRate: (coin,amount,cb) => {
        switch (coin) {
            case 0:
                // DTC payments coming soon
                break
            case 1:
                axios.get('https://api.coingecko.com/api/v3/coins/hive?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                    cb(null,response.data.market_data.current_price.usd * amount)
                }).catch((e) => cb(e))
                break
            case 2:
                axios.get('https://api.coingecko.com/api/v3/coins/hive_dollar?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                    cb(null,response.data.market_data.current_price.usd * amount)
                }).catch((e) => cb(e))
                break
            case 3:
                axios.get('https://api.coingecko.com/api/v3/coins/steem?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                    cb(null,response.data.market_data.current_price.usd * amount)
                }).catch((e) => cb(e))
                break
            case 4:
                axios.get('https://api.coingecko.com/api/v3/coins/steem-dollars?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false').then((response) => {
                    cb(null,response.data.market_data.current_price.usd * amount)
                }).catch((e) => cb(e))
                break
            default:
                return cb({ error: 'invalid coin' })
        }
    },
    Refill: (from,username,method,rawAmt,usdAmt) => {
        if (!Customers[username]) Shawp.AddUser(username)

        let newCredits = Math.floor(usdAmt / Customers[username].rate * 100000000) / 100000000
        Customers[username].balance += newCredits

        if (!RefillHistory[username])
            RefillHistory[username] = []
        
        RefillHistory[username].unshift({
            from: from,
            method: method,
            rawAmt: rawAmt,
            usdAmt: usdAmt,
            credits: newCredits
        })
    },
    Consume: () => {
        let datetoday = new Date()
        let daynow = datetoday.getDate()
        let monthnow = datetoday.getMonth()
        let yearnow = datetoday.getFullYear()
        for (user in Customers) {
            let usage = db.getTotalUsage(user)
            let gbdays = Math.round(usage / 1073741824 * 100000000) / 100000000
            Customers[user].balance -= gbdays

            if (!ConsumeHistory[user]) ConsumeHistory[user] = []
            ConsumeHistory[user].unshift([daynow + '/' + monthnow + '/' + yearnow,gbdays])
        }
    },
    getRefillHistory: (username,start,count) => {
        return RefillHistory[username].slice(start,start+count)
    },
    getConsumeHistory: (username,start,count) => {
        return ConsumeHistory[username].slice(start,start+count)
    },
    getDaysRemaining: (username,cb) => {
        let usage = db.getTotalUsage(username)
        if (usage <= 0 || !Customers[username])
            return cb(-1)
        else if (Customers[username].balance <= 0 && !Config.admins.includes(username))
            return cb(0,usage/1073741824 - Customers[username].balance)
        let days = Math.floor(Customers[username].balance / usage * 1073741824)
        if (days == 0 && !Config.admins.includes(username))
            return cb(days,usage/1073741824 - Customers[username].balance)
        else if (days == 0 && Config.admins.includes(username))
            return cb(-2)
        else
            return cb(days)
    },
    setRate: (username,usdRate) => {
        if (!Customers[username]) return
        Customers[username].rate = usdRate
    },
    WriteUserDB: () => {
        fs.writeFile('db/shawp/users.json',JSON.stringify(Customers),(e) => {
            if (e) console.log('Error saving user database: ' + err)
        })
    },
    WriteRefillHistory: () => {
        fs.writeFile('db/shawp/refills.json',JSON.stringify(RefillHistory),(e) => {
            if (e) console.log('Error saving refill database: ' + err)
        })
    },
    WriteConsumeHistory: () => {
        fs.writeFile('db/shawp/consumes.json',JSON.stringify(ConsumeHistory),(e) => {
            if (e) console.log('Error saving refill database: ' + err)
        })
    },
    coins: {
        DTC: 0,
        Hive: 1,
        HiveDollars: 2,
        Steem: 3,
        SteemDollars: 4
    },
    methods: {
        DTC: 0,
        Hive: 1,
        Steem: 2,
        Coupon: 3, // through promo/wc orders
        Referral: 4, // not sure
        System: 5
    }
}

module.exports = Shawp