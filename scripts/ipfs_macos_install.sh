#!/bin/bash
# ipfs installation script for macOS

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

VERSION=$1
if [ "$VERSION" = "" ]; then
    VERSION="0.9.1"
fi

ARCH=$2
if [ "$ARCH" = "" ]; then
    ARCH="amd64"
fi

echo "Downloading ipfs v${VERSION} for macOS..."
wget -q "https://github.com/ipfs/go-ipfs/releases/download/v${VERSION}/go-ipfs_v${VERSION}_darwin-${ARCH}.tar.gz"
tar -xvf go-ipfs_v${VERSION}_darwin-${ARCH}.tar.gz
cd go-ipfs
./install.sh
cd ..
rm -r go-ipfs
rm go-ipfs_v${VERSION}_darwin-${ARCH}.tar.gz
echo "ipfs installed successfully!"