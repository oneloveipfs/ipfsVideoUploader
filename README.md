[![Build Status](https://travis-ci.org/oneloveipfs/ipfsVideoUploader.svg?branch=master)](https://travis-ci.org/oneloveipfs/ipfsVideoUploader)
[![OneLoveIPFS Discord](https://img.shields.io/discord/956143542391169055.svg?logo=discord)](https://discord.gg/ZWj5NqaBeF)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

# OneLoveIPFS Uploader

Cross-platform IPFS uploader for 3Speak and DTube. Can be run as a standalone upload server or a locally-running Electron app. Also supports Skynet protocol.

### Dependencies required

* `nodejs` and `npm` (Latest LTS, v16 minimum supported)
* `ffmpeg`, `imagemagick` and `bc` for sprite generation and HLS video encoding.
* `go-ipfs` with a running daemon (alternatively [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop) may be used)

### Additional requirements

* A HiveSigner application (if HiveSigner authentication is used)
* A running `skyd` node for Skynet upload support.
* `tusd` running daemon when running as standalone upload server, which can be installed and configured [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md#server-installation).

# Installation

There are several ways in which OneLoveIPFS uploader can be installed and run.

* [Manual CLI install](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/Installation.md)
* [Manual desktop app compile](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/Compile.md)
* [Prebuilt desktop app](https://github.com/oneloveipfs/ipfsVideoUploader/releases)

# Configuration

The ways in which configuration is done depends on how OneLoveIPFS uploader is run. The options may be found [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ConfigDocs.md).

OneLoveIPFS data dir, which is the working directory for uploader databases and files can be set with `ONELOVEIPFS_DATA_DIR` environment variable.

# Full vs Remote vs Standalone vs Web

|Feature|Full Desktop|Remote Desktop|Standalone Server|Remote Web|
|-|:-:|:-:|:-:|:-:|
|Interface|Desktop App|Desktop App|Browser|Browser|
|Upload Server|Localhost|Remote|Localhost|Remote|
|Avalon Login Methods|Plaintext|Plaintext|Keychain / Plaintext|Keychain / Plaintext|
|Hive Login Methods|HiveAuth / Plaintext|HiveAuth / Plaintext|HiveAuth / Keychain / HiveSigner|HiveAuth / Keychain / HiveSigner|
|Login Persistence|Yes|Yes|Keychain only|Keychain only|
|Upload Protocol|Filesystem|Tus|Tus|Tus|
|Config Flexibility|Medium|Low|High|Low|
|Sprites Support|No|Remote Server|Yes (macOS & Linux)|Remote Server|
|3Speak Publishing|Yes|Yes|No|No|

# Supported file formats

IPFS works the best for videos with .mp4, however `video/mp4` and `video/quicktime` mime types will be supported. JPG, PNG and GIF file formats are supported for thumbnail uploads.

# RESTful HTTP API & IPSync

API calls for authentication, file uploads, hashes and usage data are documented [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/APIDocs.md). Resumable video upload API documentation may be found [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md).

# How to contribute?

If you found any ways to improve on the code, or found any bugs, feel free to create a pull request on the GitHub repository. You can also contact me on Discord `techcoderx#7481` if you have any enquiries.