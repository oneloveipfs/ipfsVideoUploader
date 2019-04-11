const sc2 = require('steemconnect');
const Config = require('./../config.json');

var api = sc2.Initialize({
    app: Config.SteemConnectApp,
    callbackURL: Config.callbackURL,
    accessToken: Config.clientSecret,
    scope: ['comment','comment_options']
});
var link = api.getLoginURL();
console.log('Your SteemConnect authentication link: ' + link);
