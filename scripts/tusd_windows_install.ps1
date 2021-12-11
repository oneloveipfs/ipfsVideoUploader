#Requires -RunAsAdministrator
Invoke-WebRequest -o tusd.zip "https://github.com/tus/tusd/releases/download/v1.8.0/tusd_windows_amd64.zip"
Expand-Archive -LiteralPath tusd.zip -DestinationPath tusd
Set-Location tusd/tusd*
Copy-Item tusd.exe C:\Windows\System32
Set-Location ../..
Remove-Item -Recurse tusd
Remove-Item tusd.zip