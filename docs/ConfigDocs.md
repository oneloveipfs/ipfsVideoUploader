# Config file guide

#### HTTPS settings
* `useHTTPS`: Enables HTTPS if set to true. Set this to false if using a reverse proxy, and configure HTTPS in your reverse proxy!
* `HTTPS_PORT`: Specify port to listen to HTTPS requests.
* `HTTPS_PrivKey_Dir`: Specify location of SSL private key file for HTTPS. (Only required if `useHTTPS` is true)
* `HTTPS_Cert_Dir`: Specify location of SSL certificate file for HTTPS. (Only required if `useHTTPS` is true)
* `HTTPS_CertAuth_Dir`: Specify location of SSL certificate authority file for HTTPS. (Only required if `useHTTPS` is true)

#### SteemConnect settings (only required for generating login links)
* `SteemConnectApp`: Specify the app name of your SteemConnect application.
* `callbackURL`: Specify the uploader page URL (https://yourdomain.com/upload) where the URL must be listed in SteemConnect application settings.

Ignore this section if you do not wish to support SteemConnect authentication.

#### General settings
* `IPFS_API_PORT`: Specify port that IPFS daemon listens to for IPFS API calls.
* `HTTP_PORT`: Specify port to listen to HTTP requests. If `useHTTPS` is enabled, all HTTP requests will be redirected to HTTPS.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `UsageLogs`: When set to true, disk usage data by Steem accounts will be logged.
* `tokenExpiry`: Speficy time in ms of access token expiry from time of issuance.
* `dtubefees`: Specify beneficiaries to @dtube account (100 represents 1%, 1000 represents 10%)

#### Unit tests settings

These values do not affect the functionality of the app in production.
* `hashType`: Specify hash types in an array to run database unit tests with..
* `user`: Speficy Steem username to run unit tests with.