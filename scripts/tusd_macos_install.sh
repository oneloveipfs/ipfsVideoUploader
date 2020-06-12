#!/bin/bash
# tusd installation script for macOS

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

mkdir tusd && cd tusd
echo "Downloading tusd for macOS..."
wget -q https://github.com/tus/tusd/releases/download/v1.3.0/tusd_darwin_amd64.zip
unzip tusd_darwin_amd64.zip
cd tusd_darwin_amd64
mv tusd /usr/local/bin
cd ../..
rm -r tusd
echo "tusd installed successfully!"