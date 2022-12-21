# Configuration

All prebuilt installers issued by OneLoveIPFS team are created using [config_example.json](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/config_example.json) for full uploader releases, and [remoteAppConfig.json](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/remoteAppConfig.json) for remote variants. The default configuration should be sufficient to enable users to easily upload videos to their own nodes, which makes self-hosting videos more user-friendly.

While it is possible to change the `config.json` file within the project directory that the uploader mostly depends on, this is not possible for production desktop apps. Therefore, the same config file can be created and modified in `.oneloveipfs` folder located in the [home directory](https://en.wikipedia.org/wiki/Home_directory#Default_home_directory_per_operating_system). If a valid config file is detected, those settings will be used instead.

Remote variants of OneLoveIPFS uploader desktop app have limited configurability (such as binding port and IP), as most settings depend on the remote upload server.

For full desktop apps, the sections that matter the most to end users are General Settings, Encoder, Client Config and Skynet. The others are mostly used only on standalone upload servers (such as uploader.oneloveipfs.com endpoint that OneLoveIPFS team operates).

# Config file guide

#### General settings
* `IPFS_HOST`: Specify host IP that IPFS API is binding to.
* `IPFS_API_PORT`: Specify port that IPFS daemon listens to for IPFS API calls.
* `IPFS_PROTOCOL`: Specify protocol for IPFS API.
* `HTTP_PORT`: Specify port to listen to HTTP requests.
* `HTTP_BIND_IP`: IP used for binding upload server.
* `whitelistEnabled`: When set to false, whitelist checks will be ignored.
* `spritesEnabled`: Enable video sprites generation. Not supported on Windows and Electron desktop apps.
* `durationAPIEnabled`: Enable server-side retrieval of video duration for non-HLS video uploads.
* `deleteUploadsAfterAdd`: Deletes uploaded files (non-resumable) from filesystem that are already added to IPFS.
* `enforceIPFSOnline`: Accept upload requests only if IPFS daemon is online.
* `tokenExpiry`: Speficy time in ms of access token expiry from time of issuance.
* `tokenApp`: Name of application used for generating unique access tokens.

#### Beta
These values will only apply to APIs that are currently not used by the interface or other external repositories.
* `admins`: Array of Hive accounts which have access to administrator APIs.

#### Encoder
For more info, see [Encoder.md](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/Encoder.md).
* `accounts`: Array of accounts that may be used by remote encoding servers.
* `encoder`: The hardware encoder to be used for HLS video encoding.
* `quality`: FFmpeg option to specify output video quality. Parameter varies depending on chosen encoder.
* `ffmpegPath`: Path to FFmpeg binary. Determine by running `which ffmpeg`.
* `ffprobePath`: Path to FFprobe binary. Determine by running `which ffprobe`.
* `outputs`: Array of integers consisting of output video qualities. Valid values: `4320`, `2160`, `1440`, `1080`, `720`, `480` and `240`. Empty array to disable built-in encoder.
* `threads`: Number of CPU threads to use for x264 or x265 encoding.
* `maxSizeMb`: Maximum input filesize (in MB) to accept for encoding.

#### Pin Service
Configures application-specific pinning service.
* `SPKOrigins`: Array of IPFS peer identifiers in multiaddr format to connect to during an SPK pin request.

#### Discounts
Configures usage multipliers for files with certain discount labels. JSON object with key (discount label): value (multiplier).

For example, files with `SPK` discount label to be billed at 25% of the hosting cost of the file (75% discount).

```
"Discounts": {
    "SPK": 0.25
},
```

#### Client configuration
* `authIdentifier`: Unique string to identify hosting service providers for authentication.
* `authTimeoutBlocks`: Maximum number of blocks old to accept for signature based authentication.
* `gateway`: IPFS gateway domain to use as default gateway overwrite on DTube embed player. Also used for sitewide default perferred IPFS gateway.
* `useUserPreferredGateway`: Allows users to select their own preferred IPFS gateway in app settings.
* `hivesignerEnabled`: Set to true to enable HiveSigner authentication.
* `hivesignerApp`: Specify the app name of your HiveSigner application, this is also the Hive username for collecting posting authorities.
* `blurtApp`: Specify the Blurt username that users should authorize for resolving broadcasting issues manually if needed.
* `avalonApp`: Specify the Avalon username that users should authorize for resolving broadcasting issues manually if needed.
* `tusdEndpoint`: tusd HTTP endpoint for resumable file uploads.
* `enableSupport`: Set to true to enable users to authorize their ability to post to the usernames above (or Avalon public key above) in the interface.
* `disabled`: Set to true if users should be blocked from interacting with the uploader interface. This does not affect any API calls. Useful in situations such as blockchain related issues.
* `disabledMessage`: A text that will be displayed when users are blocked from interacting with the uploader interface.
* `disabledMeme`: A meme to be displayed underneath the text above when the users are blocked from interacting with the uploader interface. File should exist in [public/memes](https://github.com/oneloveipfs/ipfsVideoUploader/tree/master/public/memes) folder.
* `uploadFromFs`: Whether to allow uploading from filesystem. Only used on Electron desktop apps.
* `noBroadcast`: Prevents broadcasting new uploads to the blockchains. Only used for debugging purposes.

#### Build
Changing this section might affect how you receive app updates.
* `number`: Integer that indicates the real app version. Increasing this number on production upload servers (defaults to uploader.oneloveipfs.com) will trigger an update on its users.
* `version`: A very short text describing the update.
* `link`: URL to the download page of the latest version of the app, to be opened when update notification clicked on desktop app.

#### Skynet
* `enabled`: When set to true, Skynet upload support is enabled.
* `portalUrl`: `skyd` API endpoint for uploading to Skynet.
* `portalUploadPath`: Skynet upload API call. Do not change unless you know what you're doing.
* `portalFileFieldname`: Skynet upload form data fieldname. Do not change unless you know what you're doing.
* `apiKey`: If required, the API key for Skynet webportals.

#### tusd settings
* `tusdUploadDir`: Directory where `tusd` uploads are saved to.
* `socketTimeout`: Timeout (in ms) where sockets will be cleared from register if upload ID is not being processed.

#### Shawp
* `Enabled`: Setting to true enables Shawp payments system for hosting credits.
* `DefaultUSDRate`: Hosting cost in USD for 1GB of files in 24 hours.
* `AvalonAPI`: Avalon API endpoint URL. It is recommended to run your own [Avalon](https://github.com/dtube/avalon) node to accept payments. Minimal node without enabling extra modules is sufficient. Not your node, not your rules.
* `HiveAPI`: Hive RPC endpoint URL. It is recommended to run your own [hived](https://gitlab.syncad.com/hive/hive) node to accept payments. Low memory node with `block_api` is sufficient. `sql_serializer` and `account_history_api` plugin is required to support recurring refills. Not your node, not your rules.
* `BlurtAPI`: Blurt RPC endpoint URL. It is recommended to run your own [blurtd](https://gitlab.com/blurt/blurt) node to accept payments. Low memory node with `block_api` is sufficient. Not your node, not your rules.
* `DtcReceiver`: Avalon account to be used for receiving DTUBE payments.
* `HiveReceiver`: Hive account to be used for receiving HIVE and HBD payments.
* `BlurtReceiver`: Blurt account to be used for receiving BLURT payments.

#### Unit tests settings

These values do not affect the functionality of the app.
* `hashType`: Specify hash types in an array to run database unit tests with.
* `user`: Specify general username to run unit tests with.
* `avalonUser`: Specify Avalon username to run unit tests with.
* `hiveUser`: Specify Hive username to run unit tests with.
* `aliasedUser`: Specify aliased username to run unit tests with.