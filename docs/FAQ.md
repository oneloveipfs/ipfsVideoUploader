# General FAQ

## 1. Why does this even exist? Do we really need an alternative video uploader?

As of now, running nodes to self-host videos on protocols such as IPFS (especially involving CLI) is something that most users don't have the technical capability for. Hence, a lot of videos on many decentralized video platforms are usually hosted by one entity, that is the core teams behind these platforms. That also means one single upload service is being relied on by its users.

OneLoveIPFS offers an alternative interface (and optionally hosting service) for video content creators, no matter their technical abilities. Users who opt to self-host can use the full desktop app build complemented by protocol specific daemon with GUI, such as [IPFS Desktop](https://github.com/ipfs/ipfs-desktop). Those who can't self-host for any reason may choose to use our hosting service as the alternative host.

## 2. Is OneLoveIPFS uploader actually decentralized?

Users may choose to use our interface as a helper tool to upload videos to their own IPFS nodes (or Skynet portals) and have them published on decentralized video platforms. They do not rely on OneLoveIPFS developers to provide any hosting, therefore the interface continues to work as long as protocols such as IPFS and Skynet, and underlying blockchains such as Hive are functional.

At the same time, OneLoveIPFS developers do run a centralized IPFS hosting service for those who do not wish to self-host. Anyone who wishes to host a copy of files uploaded to our service may fetch the IPFS hashes from the uploader API and have them pinned themselves.

As far as our code repositories go, we acknowledge that they are hosted by centralized organizations such as Github. We will be working on getting these hosted by decentralized Git protocols so that this does not become a single point of failure of the project.

## 3. Who is behind the project?

The main developer is currently [techcoderx](https://github.com/techcoderx), while other members of the OneLoveIPFS team (they are [sag333ar](https://github.com/sag333ar), [vaultec81](https://github.com/vaultec81) and [graylan0](https://github.com/graylan0)) may assist with the development of the project.

Anyone is welcome to create issues and pull requests on our maintained repositories.

## 4. Does OneLoveIPFS have a token? If not, will it ever have one?

OneLoveIPFS will **never** issue tokens of any kind. Beware of scammers that claim otherwise.

GBDays on our hosting service are just hosting credits on a centralized database that will consume daily based on your disk utilization of the day.

## 5. My question is not listed in this document. What can I do?

Contact us in [OneLoveIPFS Discord server](https://discord.gg/ZWj5NqaBeF). Include screenshot of the console output from your browser whenever applicable.

# Uploader FAQ

## 1. I'm getting an alert that I do not have access to the uploader after logging in.

For full desktop app build, ensure that `whitelistEnabled` is set to false. More details about app config [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ConfigDocs.md).

As for our hosting service (accessing through webapp or desktop app), please contact us in our [Discord server](https://discord.gg/ZWj5NqaBeF) with the transaction ID of your payment if the issue persists after the required confirmation times.

## 2. I'm getting a network error while uploading. Is there a server issue?

For remotely hosted service (i.e. uploader.oneloveipfs.com), check your internet connection and try again later. If webpage fails to load right after you get this error, there is an issue with the upload servers. You may also want to check the #service-notices channel on our [Discord server](https://discord.gg/ZWj5NqaBeF) for any service outages.

For standalone server accessed through localhost, ensure that the tusd server is actually running with the correct webhooks and `ClientConfig.tusdEndpoint` is pointed at the correct tusd endpoint.

## 3. The text underneath the submit button reads "Detecting login" even after waiting for a few minutes. What went wrong here?

This is either a HiveSigner issue if using HiveSigner auth, or blockchain API node issue. You may try changing blockchain API nodes of the networks you are logging into from the homepage next to the login button.

If the issue still persists, please contact us on our [Discord server](https://discord.gg/ZWj5NqaBeF).

## 4. What is the best specifications for thumbnails?

We recommend 1280x720px at `.jpg`, `.png` or `.gif` file formats.

## 5. Can I upload in 4K or 8K?

For self-hosters, there is no upload limit for the uploader itself. For optimal performance, you may want to have your videos pinned to multiple IPFS nodes, either manually or setting up an [IPFS cluster](https://github.com/ipfs/ipfs-cluster).

Our hosting service has been tested on 4K H.264 videos without major playback issues, although 8K has not been tested yet. IPFS has come a long way since the very first version of the uploader, so anyone with an IPFS node should be able to fetch those videos through p2p and stream them through their local gateway smoothly.

## 6. I have saved my metadata as draft, but they disappeared the next time I log in.

The drafts are stored in your web browser locally, so when you login with the same account on another web browser (or another device), it will not find your saved drafts. Also please ensure that you're not in private browsing mode while saving them as draft. Clearing your browser cache will delete your drafts as well.

## 7. How are the beneficiaries set?

0% fee whenever possible across all networks.

However, an 11.5% fee will be levied on HIVE post rewards for all 3Speak video uploads. This fee is imposed by 3Speak team, OneLoveIPFS does not have control over it.

## 8. Why must all 3Speak videos be uploaded to their centralized servers and processed through their encoding system?

As of v3.0 release, this is the only way to get any video to play on 3speak.tv website (hence the 11.5% mandated fee). Unfortunately, 3Speak is still centralized no matter what they claim to be.

With that said, the files get added to IPFS as part of their processing and its IPFS hash are published on Hive. Anyone can still host IPFS-supported 3Speak videos (in HLS container format) on their own IPFS nodes. Maybe a 3rd party frontend could exist that fetches the uploads from Hive and play the videos. Let's hope that the items on their roadmap will be delivered on-time to allow us to upload videos to 3Speak without any of their centralized infrastructure.

This is also the reason why 3Speak uploads may take some time for the IPFS node (with the uploader) to fetch from 3Speak's nodes over p2p.

## 9. What is the difference between the webapp and the desktop apps?

The webapp refers to the website in which the hosting service (it can be run by us or anyone else) is accessible through a web browser. The desktop app is an installable binary that is meant to run on your computer as an app.

Certain features may or may not be available on the webapp or the desktop app. See [here](https://github.com/oneloveipfs/ipfsVideoUploader#local-vs-remote-vs-standalone-vs-web) for more details.

## 10. What is the difference between the local and remote runtime environment?

The local environment is designed to communicate directly with a locally running IPFS daemon for ease of use, it does not communicate to a remote service (with exception of update checks). The remote environment communicates with a remote service (such as uploader.oneloveipfs.com) and works like the webapp, but with some features that are exclusive to the desktop app.

See [here](https://github.com/oneloveipfs/ipfsVideoUploader#local-vs-remote-vs-standalone-vs-web) for more details between the builds.

## 11. How do I switch between local and remote runtime environments?

On the topbar: Uploader > Switch to `<target>` environment.

Click Proceed on the confirmation box to restart the app to apply changes.

# Hosting Service FAQ

## 1. Where are your servers located?

Currently the main uploader node lives in Singapore datacenters. Additional to online IPFS nodes, an offline copy of each uploaded file is kept in local drives in case anything goes wrong with the servers.

If usage grows, additional IPFS nodes will be deployed to meet network demands. Ideally the centralized hosting service should be kept as small as possible to ensure that it does not host any majority amount of videos which undermines decentralization of the video platforms.

## 2. What sets you apart from other centralized IPFS hosting services?

OneLoveIPFS caters to platform specific needs with highly specific requirements (such as video DApps).

Ask any centralized IPFS hosting service about your 3Speak or DTube videos hosted on their services and they probably can't help. But it is something that OneLoveIPFS team is likely able to answer.

## 3. What happened to Skynet upload support?

Due to low usage, we have stopped running Sia nodes and maintaining the file contracts. Storing a few GB is much more expensive per GB than storing a few TB of data. However, Skynet support remains in the uploader which can be enabled in the config provided if you have access to a `skyd` node or willing to use a public Skynet webportal.

## 4. How long are the block confirmation times for payments?

* HIVE/HBD - 1 block (3 seconds)
* BLURT - 21 blocks (63 seconds)

## 5. How do I delete uploaded content from the service?

Currently, the uploader does not this functionality yet. Please reach out to `techcoderx#7481` on our [Discord server](https://discord.gg/ZWj5NqaBeF) for now.

## 6. What are the maximum upload sizes?

10GB for non-3Speak videos, 4MB for images of all types. There is a 5GB limit on 3Speak videos enforced on 3Speak's upload endpoints.

## 7. What happens in an event of non-payment?

Uploads are only allowed when there are sufficient hosting credits for at least 24 hours. The grace period runs for approximately 7 days, after which the files may be deleted at any time when is required for us to reclaim server space.