# Configuration

All prebuilt installers issued by OneLoveIPFS team are created using [config_example.json](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/config_example.json) for full uploader releases, and [remoteAppConfig.json](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/remoteAppConfig.json) for remote variants. The default configuration should be sufficient to enable users to easily upload DTube videos to their own IPFS nodes, which makes self-hosting DTube videos more user-friendly.

While it is possible to change the `config.json` file within the project directory that the uploader mostly depends on, this is not possible for production desktop apps. Therefore, the same config file can be created and modified in `.oneloveipfs` folder located in the [home directory](https://en.wikipedia.org/wiki/Home_directory#Default_home_directory_per_operating_system). If a valid config file is detected, those settings will be used instead.

Remote variants of OneLoveIPFS uploader desktop app have limited configurability (such as binding port and IP), as most settings depend on the remote upload server.

For full desktop apps, the sections that matter the most to end users are General Settings, Client Config and Skynet. The others are mostly used only on standalone upload servers (such as uploader.oneloved.tube endpoint that OneLoveIPFS team operates).

# Config file guide

#### General settings
* `IPFS_API_PORT`: Specify port that IPFS daemon listens to for IPFS API calls.
* `HTTP_PORT`: Specify port to listen to HTTP requests.
* `HTTP_BIND_IP`: IP used for binding upload server.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `spritesEnabled`: Enable video sprites generation. Not supported on Windows and Electron desktop apps.
* `deleteUploadsAfterAdd`: Deletes uploaded files (non-resumable) from filesystem that are already added to IPFS.
* `enforceIPFSOnline`: Accept upload requests only if IPFS daemon is online.
* `tokenExpiry`: Speficy time in ms of access token expiry from time of issuance.
* `tokenApp`: Name of application used for generating unique access tokens.

#### Beta
These values will only apply to APIs that are currently not used by the interface or other external repositories.
* `admins`: Array of Hive accounts which have access to administrator APIs. May also act as `encoderAccounts` but with admin privileges.
* `encoderAccounts`: Array of Hive accounts that may be used by encoding servers. These accounts do not have admin privileges.

#### Client configuration
* `gateway`: IPFS gateway domain to use as default gateway overwrite on DTube embed player.
* `hivesignerEnabled`: Set to true to enable HiveSigner authentication.
* `HiveSignerApp`: Specify the app name of your HiveSigner application, this is also the Hive username for collecting posting authorities.
* `SteemLoginApp`: Specify the Steem username for collecting posting authorities.
* `AvalonSupportPub`: Specify an Avalon public key that users should add for resolving broadcasting issues manually if needed.
* `tusdEndpoint`: tusd HTTP endpoint for resumable file uploads.
* `enableSupport`: Set to true to enable users to authorize their ability to post to the usernames above (or Avalon public key above) in the interface.
* `disabled`: Set to true if users should be blocked from interacting with the uploader interface. This does not affect any API calls. Useful in situations such as blockchain related issues.
* `disabledMessage`: A text that will be displayed when users are blocked from interacting with the uploader interface.
* `disabledMeme`: A meme to be displayed underneath the text above when the users are blocked from interacting with the uploader interface. File should exist in [public/memes](https://github.com/oneloveipfs/ipfsVideoUploader/tree/master/public/memes) folder.
* `uploadFromFs`: Whether to allow uploading from filesystem. Only used on Electron desktop apps.
* `noBroadcast`: Prevents broadcasting new uploads to the blockchains. Only used for debugging purposes.

#### Build
Changing this section might affect how you receive app updates.
* `number`: Integer that indicates the real app version. Increasing this number on production upload servers (defaults to uploader.oneloved.tube) will trigger an update on its users.
* `version`: A very short text describing the update.
* `link`: URL to the download page of the latest version of the app, to be opened when update notification clicked on desktop app.

#### Skynet
* `enabled`: When set to true, Skynet upload support is enabled.
* `portalUrl`: `siad` API endpoint for uploading to Skynet.
* `portalUploadPath`: Skynet upload API call. Do not change unless you know what you're doing.
* `portalFileFieldname`: Skynet upload form data fieldname. Do not change unless you know what you're doing.

#### tusd settings
* `tusdUploadDir`: Directory where `tusd` uploads are saved to.
* `socketTimeout`: Timeout (in ms) where sockets will be cleared from register if upload ID is not being processed.

#### Shawp
* `Enabled`: Setting to true enables Shawp payments system for hosting credits.
* `DefaultUSDRate`: Hosting cost in USD for 1GB of files in 24 hours.
* `AvalonAPI`: Avalon API endpoint URL. It is recommended to run your own [Avalon](https://github.com/dtube/avalon) node to accept payments. Minimal node without enabling extra modules is sufficient. Not your node, not your rules.
* `HiveAPI`: Hive RPC endpoint URL. It is recommended to run your own [hived](https://gitlab.syncad.com/hive/hive) node to accept payments. Low memory node with `block_api` is sufficient. Not your node, not your rules.
* `SteemAPI`: Steem RPC endpoint URL.
* `DtcReceiver`: Avalon account to be used for receiving DTUBE payments.
* `HiveReceiver`: Hive account to be used for receiving HIVE and HBD payments.
* `SteemReceiver`: Steem account to be used for receiving STEEM and SBD payments.

#### Coinbase Commerce
Only effective when `Coinbase` is enabled on Shawp (which should also be enabled).
* `APIKey`: API key to be used to authenticate to Coinbase Commerce account.
* `WebhookSecret`: Webhook token to be used for listening to new payments.
* `RedirectURL`: URL to be navigated to upon successful Coinbase Commerce payments.
* `CancelURL`: URL to be navigated to upon cancellation of Coinbase Commerce payments.

#### Unit tests settings

These values do not affect the functionality of the app.
* `hashType`: Specify hash types in an array to run database unit tests with.
* `user`: Specify general username to run unit tests with.
* `dtcUser`: Specify Avalon username to run unit tests with.
* `hiveUser`: Specify Hive username to run unit tests with.
* `aliasedUser`: Specify aliased username to run unit tests with.