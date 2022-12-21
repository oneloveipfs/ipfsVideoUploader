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

#### To get pinset by single type:
```
/pinsByType?user=USERNAME&hashtype=videos
```
* `user` *(required)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.
* `hashtype` *(required)*: Type of hash to obtain, comma seperated. Valid values: `videos`, `thumbnails`, `sprites`, `images`, `video240`, `video480`, `video720`, `video1080`, `subtitles` and `streams`.

#### To get update logs:
```
/updatelogs
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To get latest build release:
```
/latest_build
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To get user info:
```
/user_info?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

#### To get user aliases:
```
/get_alias?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

#### To initiate a login:
```
/login?user=USERNAME
```

* `user` *(required)*: Avalon/Hive account username
* `network` *(optional)*: Specify username network. Valid values: `hive`, `dtc` and `all`. Default: `all`.
* `dtckeyid` *(optional)*: Specify Avalon custom key ID for decryption
* `needscredits` *(optional)*: Enable check for sufficient hosting credits

The client decrypts the returned string of `encrypted_memo` using the posting key of `USERNAME`, then sends the decrypted string back to the server with `/logincb` POST API call to obtain the access token.

#### To verify generated access token:
```
/auth?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig`.

# POST API

#### To obtain access token of a login (decrypted message):
```
/logincb
```

* Content type: text/plain
* Input data: The string obtained from `/login` GET API after decrypting with posting key

#### To obtain access token of a login (signed message):
```
/loginsig
```

* Content type: text/plain
* Input data: The recently signed message

#### To upload a video:
Please refer to [ResumableUploads.md](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md) for details regarding Tus resumable video upload API.

#### To upload an image file:
```
/uploadImage?type=UPLOAD_TYPE&access_token=AUTH_TOKEN
```

* `UPLOAD_TYPE` *(required)*: Kind of image to upload. Valid values:
    - `images` -> Treats the image file as a photo that is part of Steem article body.
    - `thumbnails` -> Treats the image file as the thumbnail of a video.
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
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

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
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

#### To upload a HLS stream segment (for live streams):
```
/uploadStream?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
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

# PUT API

#### To update user settings:
```
/update_settings?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* Content type: application/json
* Example content JSON:
```
{
    uplThreads: 15,
    descTemplate: "This is some text to be included in every single video.",
    darkMode: true
}
```

#### To perform operations on user alias:
```
/update_alias?access_token=AUTH_TOKEN
```
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or `/loginsig` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.
* Content type: application/json
* Example content JSON to set alias:
```
{
    operation: "set",
    aliasKey: "decrypted value from /login of the alias user to be added"
}
```
* Example content JSON to unset alias:
```
{
    operation: "unset",
    targetUser: "username of alias user to be removed",
    targetNetwork: "network of alias user to be removed"
}
```

# IPSync

A [Socket.io](https://socket.io) endpoint that notifies other nodes of new uploads in real time.

Endpoint: `/ipsync`

An example of a client implementation may be found [here](https://github.com/techcoderx/ipsync-client).
