# FAQ

#### 1. I'm getting an alert that I do not have access to the uploader after logging in.

If you're the server admin, please add your Steem username to `whitelist.txt`, reload the uploader page and try again. Otherwise contact a server admin on how to get into the whitelist for uploader access.

#### 2. Why is .mp4 the only accepted file format for video uploads?

We have done some testing with several video file formats for IPFS, and we found that .mp4 file format performed the best for video on IPFS.

#### 3. I'm getting a sc2-sdk error while submitting video onto the blockchain. What is happenning?

Looks like SteemConnect, the auth solution that we're currently using right now, has some issues with the API. This is not an issue with upload servers or IPFS. Clear your browser cache, refresh the webpage and try again later.

Alternatively you may authenticate with Steem Keychain to avoid this SteemConnect related issue.

#### 4. I'm getting a network error while uploading. Is there a server issue?

Check your internet connection and try again later. If webpage fails to load right after you get this error, there is an issue with the upload servers.

#### 5. The text underneath the submit button reads "Detecting login" even after waiting for a few minutes. What went wrong here?

Refresh the webpage and see if your Steem username shows up. If not, there might be an issue with SteemConnect's API server. If so, try again later. (Also see below if using Brave Browser)

If using Steem Keychain for authentication, this is an auth API issue. Please take a screenshot of your console output from your browser and send a DM to `techcoderx#7481` on Discord.

#### 6. I'm getting CORS related errors logged into the console on Brave Browser. What do?

Change the Brave Shields settings to allow all cookies instead of blocking 3rd party cookies. Refresh the webpage.

#### 7. I'm not getting any encoded versions of the source video. What did I do wrong?

We have made a decision that videos should be user encoded to reduce overhead costs of running the upload servers. This also increases decentralization further because encoding is done with user's computing power, not on the server side.

You may encode your video into another video file that is lower resolution than your source video, using [Handbrake](https://handbrake.fr) with the prepared config files [here](https://steemit.com/video/@techcoderx/config-files-for-encoding-dtube-videos-with-handbrake). Then upload those files in the respective upload fields in the advanced tab of the uploader page.

#### 8. What is the best specifications for thumbnails?

We recommend either 1280x720px, or 1920x1080px at `.jpg` or `.png` file formats.

#### 9. Can I upload in 4K?

We have tested 4K video uploads (with 4K videos pinned to a single node) and it ended up playing for most users who have the average internet bandwidth required for streaming 4K videos. For optimal performance, you may want to have your videos pinned to multiple IPFS nodes, either manually or setting up an [IPFS cluster](https://github.com/ipfs/ipfs-cluster).

In 0.8.2 update, you may now call an API to obtain the list of IPFS hashes of files uploaded by certain user (or all users), categorized by videos, thumbnails and sprites. You may then sync up your node with the data returned.

You may also want to encode your video into another video file that is lower resolution than the source video file, and upload them seperately by selecting the encoded files in the respective upload fields in the advanced tab. This will allow users with poor internet connection to play the video at lower quality settings.

#### 10. I have saved my metadata as draft, but they disappeared the next time I log in.

The drafts are stored in your web browser locally, so when you login with the same account on another web browser (or another device), it will not find your saved drafts. Also please ensure that you're not in private browsing mode while saving them as draft. Clearing your browser cache will delete your drafts as well.

#### 11. How are the beneficiaries set?

For OneLoveDTube's uploader services, beneficiary to @dtube account is set to 2% to support their development and curation efforts (instead of 10%). If authenticated with SteemConnect, [additional fees](https://steemit.com/steemconnect/@fabien/major-incoming-changes-on-steemconnect) may be imposed by the SteemConnect team (up to 2.5%). Other than the $10 USD/month flat rate to use OneLoveDTube's uploader services, we do not take any other additional beneficiaries from your post payouts.

#### 12. Am I eligible for DTube curation when I upload my videos using this uploader?

Yes! We have tested this with actual high quality DTube videos, and they get picked up by the curation team, just like any other DTube videos.

#### 13. My question is not listed in this document. What can I do?

Contact us in [OneLoveIPFS Discord server](https://discord.gg/ZWj5NqaBeF), with a screenshot of the console output from your browser (if applicable).
