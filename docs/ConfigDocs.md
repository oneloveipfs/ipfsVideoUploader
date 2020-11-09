# Config file guide

#### General settings
* `IPFS_API_PORT`: Specify port that IPFS daemon listens to for IPFS API calls.
* `HTTP_PORT`: Specify port to listen to HTTP requests.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `spritesEnabled`: Enable video sprites generation. Not supported on Windows.
* `deleteUploadsAfterAdd`: Deletes uploaded files (non-resumable) from filesystem that are already added to IPFS.
* `tokenExpiry`: Speficy time in ms of access token expiry from time of issuance.
* `admins`: Array of Hive accounts which have access to administrator APIs. May also act as `encoderAccounts` but with admin privileges.
* `encoderAccounts`: Array of Hive accounts that may be used by encoding servers. These accounts do not have admin privileges.

#### Client configuration
* `gateway`: IPFS gateway domain to use as default gateway overwrite on DTube embed player.
* `hivesignerEnabled`: Set to true to enable HiveSigner authentication.
* `HiveSignerApp`: Specify the app name of your HiveSigner application, this is also the Hive username for collecting posting authorities.
* `SteemLoginApp`: Specify the Steem username for collecting posting authorities.
* `AvalonSupportPub`: Specify an Avalon public key that users should add for resolving broadcasting issues manually if needed.
* `callbackURL`: Specify the uploader page URL (https://yourdomain.com/upload) where the URL must be listed in HiveSigner application settings.
* `tusdEndpoint`: tusd HTTP endpoint for resumable file uploads.
* `enableSupport`: Set to true to enable users to authorize their ability to post to the usernames above (or Avalon public key above) in the interface.
* `disabled`: Set to true if users should be blocked from interacting with the uploader interface. This does not affect any API calls. Useful in situations such as blockchain related issues.
* `disabledMessage`: A text that will be displayed when users are blocked from interacting with the uploader interface.
* `disabledMeme`: A meme to be displayed underneath the text above when the users are blocked from interacting with the uploader interface.

#### Skynet
* `enabled`: When set to true, Skynet upload support is enabled.
* `portalUrl`: `siad` API endpoint for uploading to Skynet.
* `portalUploadPath`: Skynet upload API call. Do not change unless you know what you're doing.
* `portalFileFieldname`: Skynet upload form data fieldname. Do not change unless you know what you're doing.

#### tusd settings
* `tusdUploadDir`: Directory where `tusd` uploads are saved to.
* `socketTimeout`: Timeout (in ms) where sockets will be cleared from register if upload ID is not being processed.

#### Shawp
* `Enabled`: When set to true, pay-per-use pricing model is used instead.
* `DefaultUSDRate`: Hosting cost in USD for 1GB of files in 24 hours.
* `HiveAPI`: Hive RPC endpoint URL. It is recommended to run your own `hived` node to accept payments. Low memory node with `block_api` is sufficient. Not your node, not you rules.
* `SteemAPI`: Steem RPC endpoint URL.
* `HiveReceiver`: Hive account to be used for receiving payments.
* `SteemReceiver`: Steem account to be used for receiving payments.

#### Unit tests settings

These values do not affect the functionality of the app in production.
* `hashType`: Specify hash types in an array to run database unit tests with.
* `user`: Specify Steem username to run unit tests with.