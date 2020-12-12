#Requires -RunAsAdministrator
Invoke-WebRequest -o ffmpeg.zip "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
Expand-Archive -LiteralPath ffmpeg.zip -DestinationPath ffmpeg
Set-Location ffmpeg/ffmpeg*/bin
Copy-Item * C:\Windows\System32
Set-Location ../../..
Remove-Item -Recurse ffmpeg
Remove-Item ffmpeg.zip