# Installation

## Dependency installation

#### Linux

```
# Main dependencies
sudo apt-get update
sudo apt-get install curl git wget nodejs npm ffmpeg imagemagick bc

# NVM to use Node v16
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16

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
brew install git wget nodejs npm nvm ffmpeg imagemagick bc

# Use Node v16 with NVM
nvm install 16
nvm use 16

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
```

If running as a standalone upload server, install and configure `tusd` [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ResumableUploads.md).
