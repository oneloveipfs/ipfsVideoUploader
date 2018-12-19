# Config file guide

* `useHTTPS`: Enables HTTPS if set to true. (recommended)
* `SteemConnectApp`: Specify the app name of your SteemConnect application.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `domain`: Specify the domain where app will run on. (only needed for HTTPS to locate Letsencrypt SSL certificates)
* `callbackURL`: Specify the uploader page URL (https://yourdomain.com/upload) where the URL must be listed in SteemConnect application settings.
* `dtubefees`: Specify beneficiaries to @dtube account (100 represents 1%, 1000 represents 10%)
* `HTTP_PORT`: Specify port to listen to HTTP requests. If `useHTTPS` is enabled, all HTTP requests will be redirected to HTTPS.
* `HTTPS_PORT`: Specify port to listem to HTTPS requests.