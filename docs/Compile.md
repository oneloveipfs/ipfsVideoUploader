# Compile

After performing the manual installation [here](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/Installation.md), the uploader can be compiled from source code into Electron desktop apps that can be installed on Windows, macOS and Linux.

Two types of desktop apps may be compiled, which are full apps that are run fully on your system along with IPFS daemon (optionally `skyd`), and remote apps which acts as a desktop interface for remote standalone upload servers.

## Development app
```
npm run devapp
```

## Standalone upload server
```
npm start
```
By default the upload server will be accessible at localhost:3000, or the port specified in `config.json`.

## Build installer

It is recommended to build the installer for a target OS on the OS itself (e.g. DMG installer on macOS, DEB on Linux, EXE on Windows etc). For more info, see [electron-builder documentation](https://www.electron.build/multi-platform-build).

#### Build installer for host OS and architecture:
```
npm run build-installer
```

#### Skip macOS Code Signing
```
export CSC_IDENTITY_AUTO_DISCOVERY=false
```