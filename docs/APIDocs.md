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

#### To get uploader global statistics:
```
/stats
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

## WooCommerce related GET API
These API calls will only be enabled if `WooCommerceEnabled` is set to `true` in config.json.

#### To get WooCommerce customer info
```
/wc_user_info?access_token=AUTH_TOKEN
```

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

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
    hash: "QmUgU4GRZKA5EbhyxeUXWg7K5yc5CghfAuDEQFN9BNxPHR"
}
```

## WooCommerce related POST API
**Disabled when Shawp is used.**

These API calls will only be enabled if `WooCommerceEnabled` is set to `true` in config.json.

#### IPFS Bot usage webhook (currently used in [IPFS Discord pinning bot](https://github.com/techcoderx/DTube-IPFS-Bot))
This webhook syncs the bot usage data with the uploader so that the correct available quota balance is shown on the account details page.
```
/botusage
```

* Content type: application/json
* JSON data specs:
```
{
    token: "CustomWebhookPasswordFromKeygenOutput", // Webhook password from keygen output
    username: "techcoderx", // steem username to be updated
    size: 293892389 // new usage count in bytes
}
```

#### Order update webhook
This webhook automatically adds new customers to `whitelist.txt` and `wc.json` database once it detects a payment so that customers can authenticate immediately once they have paid. In addition, any referrals will be updated and new bonus quota allocation will be issued.
```
/wc_order_update
```

This webhook API method should be added to WooCommerce webhooks settings, with topic set to `Order updated`. Then, place the generated webhook secret in `.auth.json` file (under `WCWebhookSecret`).

# IPSync

A [Socket.io](https://socket.io) endpoint that notifies other nodes of new uploads in real time.

Endpoint: `/ipsync`

An example of a client implementation may be found [here](https://github.com/techcoderx/ipsync-client).