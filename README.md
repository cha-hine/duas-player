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
