# Sakina home agent

A small program for an always-on PC. It does work the server can't or shouldn't do:

- **Automatic sync suggestions:** when an editor clicks "Demander une suggestion" in
  `/admin/textes/<track>`, the agent downloads the audio, transcribes it with Whisper
  (whisper.cpp, word timings), aligns the known Arabic lines with what it heard and sends back the
  suggested start of each line. The editor applies them and reviews them in "Ajuster".
  Count roughly the length of the audio on a recent CPU (46 s of Al-Fatiha: 39 s).

It contacts the server (no port to open at home) and uses the worker's PocketBase account.

## Setup (Windows)

1. Install **Node.js 24** (nodejs.org).
2. Put in a folder, e.g. `C:\sakina-agent`:
   - **whisper.cpp:** `whisper-bin-x64.zip` from https://github.com/ggml-org/whisper.cpp/releases, unzipped;
   - **model:** `ggml-large-v3-turbo-q5_0.bin` (≈ 550 MB) from
     https://huggingface.co/ggerganov/whisper.cpp (good Arabic, reasonable speed);
   - **ffmpeg:** `ffmpeg-master-latest-win64-gpl.zip` from https://github.com/BtbN/FFmpeg-Builds/releases.
3. Copy `start.example.ps1` to `start.ps1`, fill in the paths and the worker's password.
4. Run `powershell -ExecutionPolicy Bypass -File agent\start.ps1`. It prints
   `watching https://sakina-api.toophan.net for sync requests`.
5. Optional: start it automatically at log-on with the Task Scheduler (see `start.example.ps1`).

## How the alignment works

`src/align.ts`: both texts are normalised (no vowel marks, unified letter variants), then a global
word alignment (Needleman-Wunsch) pairs text words with heard words, tolerating misheard ones by
letter similarity. A line starts at its first recognised word; lines with nothing recognised are
placed between their neighbours. The confidence per line is the share of its words found.
