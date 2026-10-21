# Copy this file to start.ps1 (not committed), fill in the values, then run:
#   powershell -ExecutionPolicy Bypass -File agent\start.ps1
# To start it with Windows: Task Scheduler > Create Basic Task > "When I log on" >
#   program: powershell.exe   arguments: -ExecutionPolicy Bypass -File "C:\path\to\agent\start.ps1"

$env:SAKINA_API = "https://sakina-api.toophan.net"
# The worker's PocketBase account (same as PB_WORKER_EMAIL / PB_WORKER_PASSWORD in Coolify)
$env:SAKINA_EMAIL = "worker@sakina.toophan.net"
$env:SAKINA_PASSWORD = "..."

# whisper.cpp (https://github.com/ggml-org/whisper.cpp/releases, whisper-bin-x64.zip)
$env:WHISPER_CLI = "C:\sakina-agent\whisper\Release\whisper-cli.exe"
# Model: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin
$env:WHISPER_MODEL = "C:\sakina-agent\ggml-large-v3-turbo-q5_0.bin"
# ffmpeg (https://github.com/BtbN/FFmpeg-Builds/releases, ffmpeg-master-latest-win64-gpl.zip)
$env:FFMPEG_PATH = "C:\sakina-agent\ffmpeg\bin\ffmpeg.exe"

Set-Location $PSScriptRoot
node src/index.ts
