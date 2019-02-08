# IPFS Video Uploader

This is an alternative IPFS uploader to upload videos onto DTube. Includes a basic web UI.

### Dependencies required

* `npm` command line tools
* `ffmpeg`, `imagemagick` and `bc` for sprite generation
* `go-ipfs` with a running daemon

### Additional requirements

* A SteemConnect application (if SteemConnect authentication is used)
* A domain name for HTTPS, plus SSL certificate for that domain installed

# Installation

1. Clone this repository by typing `git clone https://github.com/techcoderx/ipfsVideoUploader.git` in a terminal window.

2. Intall all required node modules. `cd ipfsVideoUploader && npm install`

3. Configure uploader by modifying `config.json` file. If you need help with the configuration, view the documentation [here](https://github.com/techcoderx/ipfsVideoUploader/blob/master/ConfigDocs.md)

4. Run `node generateKeys.js` to generate encryption and auth keys for Steem Keychain support. Then backup the contents of `.auth.json` file in a safe place.

5. Run `node getLoginLink.js` to generate SteemConnect login link (if SteemConnect is used).

6. Replace the login link with the one you obtained from step 3 [here](https://github.com/techcoderx/ipfsVideoUploader/blob/master/client/welcome.html#L7) (if SteemConnect is used).

7. If `whitelistEnabled` is set to `true`, add some Steem accounts to the whitelist by modifying [whitelist.txt](https://github.com/techcoderx/ipfsVideoUploader/blob/master/whitelist.txt). (one line per Steem user)

8. Run the app by typing `node index.js`. Your app will listen to ports you specify in `config.json` file.

All uploaded files will be saved in the `uploaded` folder within the repo. Image files (for Steem article body) will be saved in the `imguploads` folder.

# Removing support for SteemConnect

If you do not wish to support SteemConnect authentication and use only Steem Keychain, skip step 5 and 6 above when setting up, and delete lines 49-50 in [welcome.html file](https://github.com/techcoderx/ipfsVideoUploader/blob/master/client/welcome.html#L49-L50).

# Supported file formats

IPFS works the best for videos with .mp4, therefore only mp4 files will be supported at this moment. Both .jpg and .png file formats are supported for thumbnail uploads.

# GET API

To check if Steem user is in the whitelist:
```
/checkuser?user=STEEM_USERNAME
```
* `user` *(required)*: Steem account username

To get usage info for specific Steem user:
```
/usage?user=STEEM_USERNAME
```
* `user` *(required)*: Steem account username

To get list of hashes of uploaded files:
```
/hashes?user=STEEM_USERNAME&hashtype=videos,thumbnails,sprites
```

* `user` *(optional)*: Steem account username
* `hashtype` *(required)*: Type of hash to obtain. Valid values: `videos`, `thumbnails`, `sprites`, `images`, `video240`, `video480`, `video720`, `video1080`.

# How to contribute?

If you found any ways to improve on the code, or found any bugs, feel free to create a pull request on the GitHub repository. You can also contact me on Discord `techcoderx#7481` if you have any enquiries.