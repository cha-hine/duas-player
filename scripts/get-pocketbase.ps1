# Downloads the PocketBase Windows binary into pb/ for local development.
# Keep the version in sync with pb/Dockerfile.
$ErrorActionPreference = 'Stop'
$version = '0.40.5'
$pbDir = Join-Path $PSScriptRoot '..\pb'
$zip = Join-Path $env:TEMP "pocketbase_$version.zip"

Invoke-WebRequest "https://github.com/pocketbase/pocketbase/releases/download/v$version/pocketbase_${version}_windows_amd64.zip" -OutFile $zip -UseBasicParsing
Expand-Archive $zip -DestinationPath $env:TEMP\pocketbase_$version -Force
Copy-Item "$env:TEMP\pocketbase_$version\pocketbase.exe" $pbDir -Force
Remove-Item $zip
Write-Host "PocketBase $version installed in pb/. Run: .\pb\pocketbase.exe serve --dir pb\pb_data"
