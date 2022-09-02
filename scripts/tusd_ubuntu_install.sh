#!/bin/bash
# tusd installation script for Ubuntu

if [ `whoami` != root ]; then
    echo Please run this script as root or using sudo
    exit
fi

mkdir tusd && cd tusd
echo "Downloading tusd for Ubuntu..."
wget -q https://github.com/tus/tusd/releases/download/v1.9.1/tusd_linux_amd64.tar.gz
tar -xvf tusd_linux_amd64.tar.gz
cd tusd_linux_amd64
mv tusd /usr/bin
cd ../..
rm -r tusd
echo "tusd installed successfully!"