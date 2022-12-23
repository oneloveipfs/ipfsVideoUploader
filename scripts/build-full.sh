git clone https://github.com/oneloveipfs/ipfsVideoUploader oneloveipfs-full
cd oneloveipfs-full
npm i
cp config_example.json config.json
node scripts/generate-pages.js
npm run test
npm run build-installer