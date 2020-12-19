# Installation

## Dependency installation

#### Linux

```
# Main dependencies
sudo apt-get update
sudo apt-get install curl git wget nodejs npm ffmpeg imagemagick bc

# NVM to use Node v14
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
nvm install 14
npm use 14

# go-ipfs (skip this if using IPFS desktop)
# Get the latest version at https://dist.ipfs.io
wget https://dist.ipfs.io/go-ipfs/v0.7.0/go-ipfs_v0.7.0_linux-amd64.tar.gz
tar -xvf go-ipfs*
cd go-ipfs
sudo ./install.sh
cd ..
rm -r go-ipfs*
```

#### macOS

Only x86 Macs or Hackintoshes are supported. IPFS daemon does **not** currently run on Apple Silicon Macs.

```
# Install Homebrew if not already
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Main dependencies
brew install git wget nodejs npm nvm ffmpeg imagemagick bc

# Use Node v14 with NVM
npm install 14
nvm use 14

# go-ipfs (skip this if using IPFS desktop)
# Get the latest version at https://dist.ipfs.io
wget https://dist.ipfs.io/go-ipfs/v0.7.0/go-ipfs_v0.7.0_darwin-amd64.tar.gz
tar -xvf go-ipfs*
cd go-ipfs
sudo ./install.sh
cd ..
rm -r go-ipfs*
```

#### Windows

* [NodeJS + npm](https://nodejs.org)
* [Git for Windows](https://git-scm.com/download/win)

## Uploader installation

```
git clone https://github.com/oneloveipfs/ipfsVideoUploader
cd ipfsVideoUploader
npm i
cp config_example.json config.json
```

If running as a standalone upload server, install and configure `tusd` [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md).