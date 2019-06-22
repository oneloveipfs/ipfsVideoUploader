# GET API

#### To check if Steem user is in the whitelist:
```
/checkuser?user=STEEM_USERNAME
```
* `user` *(required)*: Steem account username

#### To get usage info for specific Steem user:
```
/usage?user=STEEM_USERNAME
```
* `user` *(required)*: Steem account username

#### To get total usage data for all users:
```
/totalUsage
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To obtain number of uploads for all users:
```
/totalUploadCount
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To get list of hashes of uploaded files:
```
/hashes?user=STEEM_USERNAME&hashtype=videos,thumbnails,sprites
```

* `user` *(optional)*: Steem account username
* `hashtype` *(required)*: Type of hash to obtain. Valid values: `videos`, `thumbnails`, `sprites`, `images`, `video240`, `video480`, `video720`, `video1080`.

#### To get update logs:
```
/updatelogs
```
*(There are no arguments to be specifed in the URL for this API call)*

#### To initiate a login:
```
/login?user=STEEM_USERNAME
```

* `user` *(required)*: Steem account username

The client decrypts the returned string of `encrypted_memo` using the posting key of `STEEM_USERNAME`, then sends the decrypted string back to the server with `/logincb` POST API call to obtain the access token.

# POST API

#### To obtain access token of a login:
```
/logincb
```

* Content type: text/plain
* Input data: The string obtained from `/login` GET API after decrypting with posting key

#### To upload a video:
```
/uploadVideo?access_token=AUTH_TOKEN
```

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or SteemConnect login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a SteemConnect access token.
* Content type: multipart/form-data
* File inputs:
    - `VideoUpload`: Source video file
    - `SnapUpload`: Thumbnail of the video
    - `Video240Upload` *(optional)*: 240p encoded video
    - `Video480Upload` *(optional)*: 480p encoded video
    - `Video720Upload` *(optional)*: 720p encoded video
    - `Video1080Upload` *(optional)*: 1080p encoded video
* Output data example:
```
{
    dtubefees: 200,
    duration: 666.967,
    filesize: 553986721,
    ipfshash: "QmXEVRMFWJtGodYdcQQ5EEVJE7VTsq4rPcoBet4KLonF1r",
    ipfs240hash: "QmUjfPkDTBz7GVrvxDH1SZeLmvR5xDTEX2ogvfGZMG6Ake",
    ipfs480hash: "QmXpM81BhGGoBF9QUQMCU9yKJxjtKfChyEUU1AP8KzKh3B",
    ipfs720hash: "QmSGEj3j7i1YJtYmuAEKzNaKhifDiB41fdiDHjAeGSpMGe",
    snaphash: "QmUKHnTN3TR8zS2s2xUqvv6rzcwogh4T64Un3u4B2UBkt8",
    spritehash: "QmTfsUT6aS2QXUoA9CSgTF9Lp4sFruRix29RjxznkQVCv1"
}
```

#### To upload an image file:
```
/uploadImage?type=UPLOAD_TYPE&access_token=AUTH_TOKEN
```

* `UPLOAD_TYPE` *(required)*: Kind of image to upload. Valid values:
    - `images` -> Treats the image file as a photo that is part of Steem article body.
    - `thumbnails` -> Treats the image file as the thumbnail of a video.
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or SteemConnect login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a SteemConnect access token.
* Content type: multipart/form-data
* File input: `image`
* Output data example:
```
{
    imghash: "QmUKHnTN3TR8zS2s2xUqvv6rzcwogh4T64Un3u4B2UBkt8"
}
```

#### To upload a subtitle:
```
/uploadSubtitle?access_token=AUTH_TOKEN
```

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or SteemConnect login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a SteemConnect access token.
* Content type: text/plain
* Text input must be a valid WebVTT subtitles or else it will return an error.
* Output data example:
```
{
    hash: "QmUgU4GRZKA5EbhyxeUXWg7K5yc5CghfAuDEQFN9BNxPHR"
}
```