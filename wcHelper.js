// const WooCommerce = require('woocommerce-api')
const Crypto = require('crypto-js')
const fs = require('fs')
const Keys = require('./.auth.json')
const db = require('./dbManager')
const Config = require('./config.json')

let Customers = JSON.parse(fs.readFileSync('db/wc.json'))

// Setup WooCommerce
/*
let WooCommerceAPI
if (Config.WooCommerceEnabled === true) {
    WooCommerceAPI = new WooCommerce(Config.WooCommerceConfig)
}
*/

let WCMethods = {
    VerifyWebhook: (raw,signature,cb) => {
        let hash = Crypto.HmacSHA256(raw,Keys.WCWebhookSecret)
        let b64Hash = Crypto.enc.Base64.stringify(hash)
        if (b64Hash === signature)
            cb(true)
        else
            cb(false)
    },
    AddUser: (username,wcid,tier,offset) => {
        Customers[username] = {
            id: wcid,
            tier: tier,
            quotaOffset: offset,
            referred: []
        }
    },
    AddReferral: (username,referrer) => {
        if (Customers[username] == undefined || Customers[referrer] == undefined) return
        Customers[username].referredBy = referrer
        Customers[referrer].referred.push(username)
    },
    User: (username) => {
        if (Customers[username] != undefined) {
            let det = Customers[username]
            det.package = Config.WooCommerceSettings.Tiers[det.tier]
            det.avail = WCMethods.TotalQuota(username)
            return det
        } else return {}
    },
    TotalQuota: (username) => {
        // Calculates actual total quota taking offsets and referral bonus into account
        if (Customers[username] == undefined) return 0
        let baseQuota = Config.WooCommerceSettings.Tiers[Customers[username].tier].quota // Included quota in purchased WooCommerce subscription
        let offsetQuota = Customers[username].quotaOffset // Arbitrary offset quota amount
        let bonusQuota = Customers[username].referred.length * Config.WooCommerceSettings.Referral.quotaBonus // Bonus quota from referrals

        if (bonusQuota > Config.WooCommerceSettings.Referral.maxBonus)
            bonusQuota = Config.WooCommerceSettings.Referral.maxBonus
        
        return baseQuota + offsetQuota + bonusQuota
    },
    AvailableQuota: (username,cb) => {
        db.getTotalUsage(username,(usage) => {
            cb(WCMethods.TotalQuota(username) - usage)
        })
    },
    WriteWCUserData: () => {
        fs.writeFile('db/wc.json',JSON.stringify(Customers),(err) => {
            if (err)
                console.log('Error saving usage logs: ' + err)
        })
    }
}

module.exports = WCMethods