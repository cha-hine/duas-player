# Sakina (سكينة)

Duas, Quran, Islamic web TV and live player — Arabic / French.
See [PLAN.md](PLAN.md) for the roadmap.

## Layout

| Folder | What it is |
|---|---|
| `web/` | Public website (SvelteKit, Node adapter) |
| `pb/` | PocketBase: content admin, database, login, file storage |
| `worker/` | Media worker (Node + ffmpeg) |
| `brand/` | Logo and brand assets |
| `scripts/` | Helper scripts |

## Local development (Windows)

Requires Node.js 24+.

```powershell
# 1. PocketBase (first time: download the binary)
.\scripts\get-pocketbase.ps1
.\pb\pocketbase.exe serve --dir pb\pb_data --migrationsDir pb\pb_migrations --hooksDir pb\pb_hooks
# Admin panel: http://127.0.0.1:8090/_/
# First time: create a local superuser and demo content
.\pb\pocketbase.exe superuser upsert dev@sakina.local "dev-password-123" --dir pb\pb_data
node scripts\seed-dev.ts dev@sakina.local "dev-password-123"

# 2. Website (another terminal)
cd web
npm install
npm run dev
# http://localhost:5173  (upload page: http://localhost:5173/admin)

# 3. Worker (another terminal)
cd worker
npm start
```

## Deployment (Coolify)

Create a **Docker Compose** resource in Coolify pointing at this repo; it uses `docker-compose.yaml`.

- Domains: `web` → `https://sakina.toophan.net` (port 3000), `pocketbase` → `https://sakina-api.toophan.net` (port 8090). The admin panel is at `https://sakina-api.toophan.net/_/`.
- Environment variables: `ORIGIN=https://sakina.toophan.net`, `PUBLIC_PB_URL=https://sakina-api.toophan.net`.
- The `pb_data` volume holds the database and uploads: include it in backups.

## Adding content

- **Upload page:** `https://sakina.toophan.net/admin`. Log in with the PocketBase superuser account.
  Files of any size (up to 10 GB) are sent in 32 MB pieces, so they pass Cloudflare's 100 MB limit,
  and an interrupted upload resumes where it stopped.
- **PocketBase panel:** `https://sakina-api.toophan.net/_/` for editing records, categories and reciters.
  Uploads through this panel are limited to 100 MB by Cloudflare.
- The content model lives in `pb/pb_migrations/`; PocketBase applies new migrations automatically on start.
- **Bulk import** of a folder whose sub-folders are named after category slugs
  (`douas/`, `ziyarat/`, `latmiyat/`…):
  ```powershell
  $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
  node scripts\import-folder.ts D:\mes-fichiers            # drafts
  node scripts\import-folder.ts D:\mes-fichiers --publish  # published directly
  ```

## Telegram bot

Members of the Telegram group post a link (YouTube, Instagram, TikTok, Facebook, direct `.mp3`/`.mp4`)
or an audio/video file. The bot (`bot/`):

1. reads the title and description (yt-dlp, or the Telegram file details);
2. asks Claude whether it is relevant, which category it belongs to, and for clean French/Arabic titles
   and the reciter; off-topic content is refused with a reason;
3. downloads it (links with a video become videos; add `#audio` to keep only the sound, `#video` to force video),
   creates the track or video **published**, and skips links already imported;
4. replies in the group with an **Annuler** button (sender or group admins) and updates the message when it is online.

Setup:

1. **@BotFather**: `/newbot` → token. Then `/setprivacy` → *Disable*, so the bot sees all group messages.
   Add the bot to the group.
2. **my.telegram.org** → *API development tools* → `api_id` and `api_hash` (for files over 20 MB).
3. **console.anthropic.com** → an API key.
4. In Coolify set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `ANTHROPIC_API_KEY`, redeploy,
   send `/id` in the group, then set `TELEGRAM_ALLOWED_CHATS` to that id (comma-separated for several groups)
   and redeploy. Messages from other chats are ignored.

The bot logs in to PocketBase with the worker's account (`PB_WORKER_EMAIL` / `PB_WORKER_PASSWORD`).
**YouTube "Sign in to confirm you're not a bot".** YouTube blocks downloads from server addresses unless
the bot uses the cookies of a YouTube account (use a secondary Google account, not your main one):

1. In a **private browser window**, log in to YouTube with that account.
2. With the extension *Get cookies.txt LOCALLY*, export the cookies of `youtube.com` (Netscape format).
3. Close the private window right away (so YouTube does not renew those cookies in the browser).
4. Coolify → service `bot` → **Storages** → add a **file mount** at `/config/youtube-cookies.txt`
   with the content of the exported file, then redeploy. The logs show `using YouTube cookies`.

When the bot says the cookies expired, export them again the same way.

## Media processing (worker)

After each upload, the worker (`worker/`) processes the file automatically:

- **Audio:** loudness evened out to -16 LUFS, encoded to AAC (`stream` field), duration and waveform.
- **Video:** adaptive HLS stream in 360p / 720p / 1080p (never upscaled) served at
  `https://sakina-api.toophan.net/media/hls/<id>/master.m3u8`, plus a poster image.

The record's `status` goes `pending` → `processing` → `ready` (or `error`, with the reason in
`processing_error`). Set the status back to `pending` in the admin panel to process a record again.

The worker logs in as its own superuser. Create it once in the Coolify terminal of the `pocketbase` service:

```sh
/pb/pocketbase superuser upsert worker@sakina.toophan.net "A-LONG-RANDOM-PASSWORD"
```

then set `PB_WORKER_EMAIL` and `PB_WORKER_PASSWORD` to the same values in Coolify.
