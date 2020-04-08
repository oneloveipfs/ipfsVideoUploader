const Config = require('./config.json')
const db = require('./dbManager')
const hive = require('@hiveio/hive-js')
const steem = require('steem')
const fs = require('fs')
const axios = require('axios')
  
hive.api.setOptions({url: Config.Shawp.HiveAPI, useAppbaseApi: true })
steem.api.setOptions({ url: Config.Shawp.SteemAPI, useAppbaseApi: true })

let Customers = JSON.parse(fs.readFileSync('db/shawp/users.json'))
let RefillHistory = JSON.parse(fs.readFileSync('db/shawp/refills.json'))

let Shawp = {
    init: () => {
        // Stream transactions from blockchain
        if (!Config.Shawp.Enabled) return
        if (Config.Shawp.HiveReceiver) hive.api.streamTransactions((err,tx) => {
            let transaction = tx
            if (transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.HiveReceiver) {
                let tx = transaction.operations[0][1]
                if (tx.amount.endsWith('HIVE')) {
                    let amt = parseFloat(tx.amount.replace(' HIVE',''))
                    Shawp.ExchangeRate(Shawp.coins.Hive,amt,(e,usd) => {
                        Shawp.Refill(tx.from,tx.from,"Hive",tx.amount,usd)
                        Shawp.WriteRefillHistory()
                        Shawp.WriteUserDB()
                        console.log('Refilled ' + (usd/0.0029) + ' credits successfully')
                    })
                } else if (tx.amount.endsWith('HBD')) {
                    let amt = parseFloat(tx.amount.replace(' HBD',''))
                    Shawp.ExchangeRate(Shawp.coins.HiveDollars,amt,(e,usd) => {
                        console.log(usd)
                    })
                }
            }
        })
        
        if (Config.Shawp.SteemReceiver) steem.api.streamTransactions((err,tx) => {
            let transaction = tx
            if (transaction.operations[0][0] === 'transfer' && transaction.operations[0][1].to === Config.Shawp.SteemReceiver) {
                let tx = transaction.operations[0][1]
                
            }
        })
    },
    AddUser: (username) => {
        if (Customers[username]) return
        Customers[username] = {
            rate: Config.Shawp.DefaultUSDRate,
            balance: 0,
            joinedSince: new Date().getTime()
        }
    },
    User: (username) => {
        return Customers[username] || {}
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
    getRefillHistory: (username,start,count) => {
        return RefillHistory[username].slice(start,start+count)
    },
    getDaysRemaining: (username,cb) => {
        db.getTotalUsage(username,(usage) => {
            if (usage <= 0)
                return cb(-1)
            else
                return cb(Math.floor(Customers[username].balance / usage * 1073741824))
        })
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
    coins: {
        DTC: 0,
        Hive: 1,
        HiveDollars: 2,
        Steem: 3,
        SteemDollars: 4
    }
}

module.exports = Shawp