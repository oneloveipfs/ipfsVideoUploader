const sc2 = require('steemconnect');
const Config = require('./../config.json');

var api = sc2.Client({
    app: Config.SteemConnectApp,
    callbackURL: Config.callbackURL,
    scope: ['comment','comment_options']
});
var link = api.getLoginURL();
console.log('Your SteemConnect authentication link: ' + link);
