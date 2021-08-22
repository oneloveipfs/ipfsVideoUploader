# GET API

#### To check if user is in the whitelist:
```
/checkuser?user=USERNAME
```
* `user` *(required)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.

#### To get usage info for specific user:
```
/usage?user=USERNAME
```
* `user` *(required)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.

#### To get uploader global statistics:
```
/stats
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To get list of hashes of uploaded files:
```
/hashes?user=USERNAME&hashtype=videos,thumbnails,sprites
```

* `user` *(optional)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.
* `hashtype` *(optional)*: Type of hash to obtain, comma seperated. Valid values: `videos`, `thumbnails`, `sprites`, `images`, `video240`, `video480`, `video720`, `video1080`, `subtitles` and `streams` Default: All.

#### To get update logs:
```
/updatelogs
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To initiate a login:
```
/login?user=USERNAME
```

* `user` *(required)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.
* `dtckeyid` *(optional)*: Specify Avalon custom key ID for decryption
* `needscredits` *(optional)*: Enable check for sufficient hosting credits

The client decrypts the returned string of `encrypted_memo` using the posting key of `USERNAME`, then sends the decrypted string back to the server with `/logincb` POST API call to obtain the access token.

# POST API

#### To obtain access token of a login:
```
/logincb
```

* Content type: text/plain
* Input data: The string obtained from `/login` GET API after decrypting with posting key

#### To upload a video:
Please refer to [ResumableUploads.md](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md) for details regarding Tus resumable video upload API.

#### To upload an image file:
```
/uploadImage?type=UPLOAD_TYPE&access_token=AUTH_TOKEN
```

* `UPLOAD_TYPE` *(required)*: Kind of image to upload. Valid values:
    - `images` -> Treats the image file as a photo that is part of Steem article body.
    - `thumbnails` -> Treats the image file as the thumbnail of a video.
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* Content type: multipart/form-data
* File input: `image`
* Output data example:
```
{
    username: "techcoderx",
    network: "all",
    imgtype: "images",
    imghash: "QmUKHnTN3TR8zS2s2xUqvv6rzcwogh4T64Un3u4B2UBkt8"
}
```

#### To upload a subtitle:
```
/uploadSubtitle?access_token=AUTH_TOKEN
```

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* Content type: text/plain
* Text input must be a valid WebVTT subtitles or else it will return an error.
* Output data example:
```
{
    username: "techcoderx",
    network: "all",
    hash: "QmUgU4GRZKA5EbhyxeUXWg7K5yc5CghfAuDEQFN9BNxPHR"
}
```

#### To upload a HLS stream segment:
```
/uploadStream?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* Content type: multipart/form-data
* File input: `segment`
* Additional field:
    - `streamId`: ID of on-chain Alive stream in the format of `network/streamer/link`.
* Output data example:
```
{
    username: "techcoderx",
    network: "all",
    type: "streams",
    hash: "QmedMWg9BAicneQQax7LouQpUsMGGiBJkke6bPACnVFB95"
}
```

#### IPFS Bot usage webhook (currently used in [IPFS Discord pinning bot](https://github.com/techcoderx/DTube-IPFS-Bot))
This webhook syncs the bot usage data with the uploader so that the correct available quota balance is shown on the account details page. **This is currently WIP**

# IPSync

A [Socket.io](https://socket.io) endpoint that notifies other nodes of new uploads in real time.

Endpoint: `/ipsync`

An example of a client implementation may be found [here](https://github.com/techcoderx/ipsync-client).