# Installation

## Dependency installation

#### Linux

```
# Main dependencies
sudo apt-get update
sudo apt-get install curl git wget ffmpeg imagemagick bc

# NVM to use Node v18
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# go-ipfs (skip this if using IPFS desktop)
# Get the latest version at https://dist.ipfs.io
wget https://raw.githubusercontent.com/oneloveipfs/ipfsVideoUploader/master/scripts/ipfs_ubuntu_install.sh
chmod +x ipfs_ubuntu_install.sh
sudo ./ipfs_ubuntu_install.sh
```

#### macOS

```
# Install Homebrew if not already
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Main dependencies
brew install git wget ffmpeg imagemagick bc

# Use Node v18 with NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# go-ipfs (skip this if using IPFS desktop)
# Get the latest version at https://dist.ipfs.io
wget https://raw.githubusercontent.com/oneloveipfs/ipfsVideoUploader/master/scripts/ipfs_macos_install.sh
chmod +x ipfs_macos_install.sh
sudo ./ipfs_macos_install.sh
```

#### Windows

* [NodeJS + npm](https://nodejs.org)
* [Git for Windows](https://git-scm.com/download/win)
* [Go-IPFS](https://github.com/ipfs/go-ipfs/releases)
* [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop/releases)

## Uploader installation

```
git clone https://github.com/oneloveipfs/ipfsVideoUploader
cd ipfsVideoUploader
npm i
cp config_example.json config.json
node scripts/generate-pages.js
```

## Olisc module

#### Install
```
npm run install-olisc
```

#### Uninstall
```
npm run remove-olisc
```

If running as a standalone upload server, install and configure `tusd` [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md).
