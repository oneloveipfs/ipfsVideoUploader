git clone https://github.com/oneloveipfs/ipfsVideoUploader oneloveipfs-remote
cd oneloveipfs-remote
npm i
cp config_example.json config.json
REMOTE_APP=1 npm run prepapp
npm run dep-prune
npm run build-installer
