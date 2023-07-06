#!/bin/bash
# ipfs installation script for macOS

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

VERSION=$1
if [ "$VERSION" = "" ]; then
    VERSION="0.21.0"
fi

ARCH="$(uname -m)"
if [ $ARCH == "x86_64" ]; then
    if [ "$(sysctl -in sysctl.proc_translated)" = "1" ]; then
        echo "Seems that you are running this in Rosetta 2. Please run this natively in arm64."
        exit
    else
        ARCH="amd64"
    fi 
fi

echo "Downloading ipfs v${VERSION} for macOS..."
echo "Architecture: ${ARCH}"
wget -q "https://github.com/ipfs/kubo/releases/download/v${VERSION}/kubo_v${VERSION}_darwin-${ARCH}.tar.gz"
tar -xvf kubo_v${VERSION}_darwin-${ARCH}.tar.gz
cd kubo
./install.sh
cd ..
rm -r kubo
rm kubo_v${VERSION}_darwin-${ARCH}.tar.gz
echo "ipfs installed successfully!"