# Verify Download

If using the prebuilt installers, it is important to verify that you have downloaded the correct file such that it has not been tampered by a third party.

Due to the exorbitant costs of code-signing our desktop apps, you may experience some security-related warnings when running the prebuilt installers. Hence, we will be publishing the SHA256 hashes for each build on the blockchains so that you can cross-check them yourself and verify that the downloaded installer is an authentic copy issued by us.

You can verify your download by running the following commands:

###### Linux/macOS terminal
```
shasum -a 256 /path/to/donwloaded/file
```

###### Windows Powershell
```
Get-FileHash C:\path\to\downloaded\file
```

You can view the signed SHA256 hashes for the prebuilt installers in the announcement posts linked in the [releases](https://github.com/oneloveipfs/ipfsVideoUploader/releases), or in [@oneloveipfs](https://avalonblocks.com/#/@oneloveipfs) account on Avalon.