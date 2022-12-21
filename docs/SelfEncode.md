# Self Encode

**NOTE: All 3Sepak videos MUST go through 3Speak's centralized API and encoding system as of v3.0 release. There is no other way to get them to play on 3speak.tv website.**

A remote app user may choose to encode their videos themselves rather than using a third party encoding service such as the built-in encoder within the service or a remote encoder whitelisted by the service.

The self-encoder will encode the video file to HLS container format before uploading, then upload the resulting HLS output recursively to the service. The below describes the procedure of carrying out a self-encode upload.

We assume that the encoding job has been completed by the self-encode user and the HLS container is ready to upload.

## 1. Registration

Each self-encode upload must be registered first to prepare the directories on the server for the user to upload to.

Make a POST API call as such:
```
/encoder/self/register?duration=DURATION&outputs=OUTPUT1,OUTPUT2&access_token=TOKEN
```

Replace `DURATION` with total video duration (in seconds), `OUTPUT1,OUTPUT2` with comma-separated output quality (for example, 1080p, 720p and 480p outputs would be `1080,720,480`), `TOKEN` with access token. Append `&scauth=true` if access token is a HiveSigner access token.

If successful, the call will return the encode ID (`id`, string) which will be needed in the later steps.

## 2. Upload Stat

For all feedback regarding upload progress and result, register with upload stat socket.io endpoint with type `hls`.

```js
let uplStat = io.connect('/uploadStat')
uplStat.emit('registerid',{
    id: 'upload id from step 1 above',
    type: 'hls',
    access_token: 'your access token here',
    keychain: 'not hivesigner?'
})
```

## 3. Recursive Upload

Upload each file in the HLS container recursively with type `hlsencode`. Specify the encode ID from step 1 above, the index for each .ts file (filename string without .ts or -1 for m3u8 playlist file) and output without `p` suffix for each file. Submit each upload one-by-one to the tusd endpoint.

Sample NodeJS implementation may be found [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/src/selfEncoderUpload.js).

## 4. Finalize upload

Once every file has been uploaded successfully, finalize the self-encode uplaod to begin post-upload processing such as adding the container to IPFS.

Make a POST API call as such:
```
/encoder/self/register?access_token=TOKEN
```
Replace `TOKEN` with access token. Append `&scauth=true` if access token is a HiveSigner access token.

From here, listen for upload result as usual from the upload stat socket.io endpoint.