# Config file guide

#### SteemConnect settings (only required for generating login links)
* `SteemConnectApp`: Specify the app name of your SteemConnect application.
* `callbackURL`: Specify the uploader page URL (https://yourdomain.com/upload) where the URL must be listed in SteemConnect application settings.

Ignore this section if you do not wish to support SteemConnect authentication.

#### General settings
* `IPFS_API_PORT`: Specify port that IPFS daemon listens to for IPFS API calls.
* `HTTP_PORT`: Specify port to listen to HTTP requests.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `UsageLogs`: When set to true, disk usage data by Steem accounts will be logged.
* `tokenExpiry`: Speficy time in ms of access token expiry from time of issuance.
* `admins`: Array of Steem accounts which have access to administrator APIs.

#### Client configuration
* `gateway`: IPFS gateway domain to use as default gateway overwrite on DTube embed player. Do **not** include `https://` part.
* `steemconnectEnabled`: Set to true to enable SteemConnect authentication.
* `steemconnectLoginURL`: SteemConnect URL to open in web browser for authentication.

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