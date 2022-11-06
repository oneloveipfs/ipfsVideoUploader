// Helper file for communicating with 3Speak APIs
const axios = require('axios')
const SPK_API_URL = 'https://studio.3speak.tv'

const spk = {
    auth: async (username) => {
        try {
            let r = await axios.get(SPK_API_URL+'/mobile/login?username='+username)
            if (r.data && r.data.error)
                return { error: r.data.error }
            else if (r.data && !r.data.memo)
                return { error: 'No memo to decode?!' }
            return { memo: r.data.memo }
        } catch (e) {
            return { error: e.toString() }
        }
    },
    cookie: async (username, token) => {
        try {
            let r = await axios.get(SPK_API_URL+'/mobile/login?username='+username+'&access_token='+token)
            if (r.data && r.data.error)
                return { error: r.data.error }
            return { cookie: r.headers['set-cookie'] }
        } catch (e) {
            return { error: e.toString() }
        }
    }
}

module.exports = spk