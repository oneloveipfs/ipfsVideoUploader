git clone https://github.com/oneloveipfs/ipfsVideoUploader oneloveipfs-remote
cd oneloveipfs-remote
npm i
cp remoteAppConfig.json config.json
REMOTE_APP=1 npm run prepapp
node scripts/generate-pages.js
npm run dep-prune
npm run build-installer
