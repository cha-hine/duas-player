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

# 2. Website (another terminal)
cd web
npm install
npm run dev
# http://localhost:5173

# 3. Worker (another terminal)
cd worker
npm start
```

## Deployment (Coolify)

Create a **Docker Compose** resource in Coolify pointing at this repo; it uses `docker-compose.yaml`.

- Domains: `web` → `https://sakina.toophan.net` (port 3000), `pocketbase` → `https://api.sakina.toophan.net` (port 8090). The admin panel is at `https://api.sakina.toophan.net/_/`.
- Environment variables: `ORIGIN=https://sakina.toophan.net`, `PUBLIC_PB_URL=https://api.sakina.toophan.net`.
- The `pb_data` volume holds the database and uploads: include it in backups.
