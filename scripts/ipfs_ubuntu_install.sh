#!/bin/bash
# ipfs installation script for Ubuntu

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

VERSION=$1
if [ "$VERSION" = "" ]; then
    VERSION="0.11.0"
fi

echo "Downloading ipfs v${VERSION} for Ubuntu..."
wget -q "https://github.com/ipfs/go-ipfs/releases/download/v${VERSION}/go-ipfs_v${VERSION}_linux-amd64.tar.gz"
tar -xvf go-ipfs_v${VERSION}_linux-amd64.tar.gz
cd go-ipfs
./install.sh
cd ..
rm -r go-ipfs
rm go-ipfs_v${VERSION}_linux-amd64.tar.gz
echo "ipfs installed successfully!"