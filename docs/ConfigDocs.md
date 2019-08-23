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

#### WooCommerce settings
* `WooCommerceEnabled`: When set to true, WooCommerce API will be used to enable additional functionalities (e.g. disk usage quota, bot sync through webhook etc.)
* `WooCommerceConfig`: Configuration for WooCommerce REST API. Full documentation on API configuration can be viewed [here](https://www.npmjs.com/package/woocommerce-api#setup). Note: It is recommended to use `wc/v1` as other versions may not work with subscriptions.
* `WooCommerceSettings`: Configuration for subscription tiers and referrals.

###### Subscription tiers
* `wcpid`: Product ID on WooCommerce product website for subscription tier.
* `name`: Subscription plan name, which will be shown in user's account details page.
* `price`: Subscription cost per month.
* `quota`: Total allocated quota for subscription tier.

###### Referrals
* `quotaBonus`: Bonus quota allocated for each customer referred.
* `maxBonus`: Maximum possible bonus allocation for referrals per referrer.

#### Unit tests settings

These values do not affect the functionality of the app in production.
* `hashType`: Specify hash types in an array to run database unit tests with.
* `user`: Specify Steem username to run unit tests with.