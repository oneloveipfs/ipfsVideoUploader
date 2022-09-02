#!/bin/bash
# tusd installation script for macOS

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
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

mkdir tusd && cd tusd
echo "Downloading tusd for macOS..."
echo "Architecture: ${ARCH}"
wget -q https://github.com/tus/tusd/releases/download/v1.9.1/tusd_darwin_${ARCH}.zip
unzip tusd_darwin_${ARCH}.zip
cd tusd_darwin_${ARCH}
mv tusd /usr/local/bin
cd ../..
rm -r tusd
echo "tusd installed successfully!"