#!/bin/bash
# ipfs installation script for Ubuntu

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

VERSION=$1
if [ "$VERSION" = "" ]; then
    VERSION="0.16.0"
fi

echo "Downloading ipfs v${VERSION} for Ubuntu..."
wget -q "https://github.com/ipfs/kubo/releases/download/v${VERSION}/kubo_v${VERSION}_linux-amd64.tar.gz"
tar -xvf kubo_v${VERSION}_linux-amd64.tar.gz
cd kubo
./install.sh
cd ..
rm -r kubo
rm kubo_v${VERSION}_linux-amd64.tar.gz
echo "ipfs installed successfully!"