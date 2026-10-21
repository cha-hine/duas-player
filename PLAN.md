# Sakina (سكينة) — Project Plan

Duas, Quran, Islamic web TV and live player. Bilingual Arabic / French.

Each task is small (about half a day to one day) and has a clear "done when".
Tick the box when a task is finished.

## Stack

| Layer | Choice |
|---|---|
| Website | SvelteKit (Node adapter) |
| Content admin, database, login, files | PocketBase |
| Media processing | Worker container with ffmpeg |
| Video playback | HLS + hls.js |
| Animated backgrounds | WebGL shaders + Web Audio API |
| Live broadcasts | MediaMTX |
| File storage | Coolify volume first; Garage (S3) if the library outgrows one disk |
| Hosting | Coolify (Docker Compose) |

MinIO is not used: its open-source repository was archived in April 2026.

## Brand

- Name: **Sakina (سكينة)** — tagline *Écouter · Comprendre · S'apaiser*
- Logo: mihrab arch with a play mark and a sound line (`brand/logo.svg`)
- Colours: Night `#0B1A2E`, Deep `#12263F`, Gold `#C9A24B`, Emerald `#1F7A6B`, Ivory `#F4EFE3`, Mist `#8A9BB0`
- Fonts: KFGQPC Uthmanic Hafs / Amiri Quran (Quran), Noto Naskh Arabic (Arabic UI), Cormorant Garamond + Inter (French)

---

## Phase 0 — Setup and hosting

- [x] **0.1** Create the monorepo layout: `web/` (SvelteKit), `pb/` (PocketBase), `worker/` (ffmpeg), `brand/`. *Done when:* folders exist with a README each.
- [x] **0.2** Scaffold SvelteKit with TypeScript and the Node adapter. *Done when:* `npm run dev` shows a page.
- [x] **0.3** Add a PocketBase Dockerfile with a persistent data volume. *Done when:* the admin panel opens locally.
- [x] **0.4** Write `docker-compose.yaml` for web + PocketBase + worker. *Done when:* `docker compose up` starts all three.
- [x] **0.5** Push the repo to GitHub/GitLab and connect it to Coolify. *Done when:* Coolify builds from the repo.
- [x] **0.6** Set the domain and HTTPS in Coolify (`sakina.toophan.net` + `sakina-api.toophan.net`). *Done when:* both URLs load over HTTPS.
- [x] **0.7** Turn on automatic deploys on push. *Done when:* a commit to `main` redeploys.
- [ ] **0.8** Set up daily backups of the PocketBase volume. *Done when:* a backup restores successfully on a test instance.

## Phase 1 — Brand and design system

- [x] **1.1** Finalise the logo; export favicon, app icons (192/512), social image. *Done when:* files are in `brand/` and `web/static/`.
- [x] **1.2** Define colour and spacing tokens as CSS variables (dark default + light mode). *Done when:* one `tokens.css` drives all colours.
- [x] **1.3** Self-host the fonts with Arabic + Latin subsets. *Done when:* fonts load with no external request.
- [x] **1.4** Build base components: button, card, tag, icon button, slider. *Done when:* a `/styleguide` page shows them all.
- [x] **1.5** Build the site layout: header, language switch, footer. *Done when:* layout works at phone and desktop width.
- [x] **1.6** Add French/Arabic translations and right-to-left switching. *Done when:* switching to Arabic mirrors the layout and translates the interface.

## Phase 2 — Content model (PocketBase)

- [x] **2.1** `categories` collection (name_ar, name_fr, slug, icon, order). *Done when:* categories can be created in the admin panel.
- [x] **2.2** `reciters` collection (name_ar, name_fr, photo, bio). *Done when:* reciters can be created.
- [x] **2.3** `tracks` collection (title_ar, title_fr, category, reciter, audio file, duration, status). *Done when:* an audio track can be uploaded.
- [x] **2.4** `lines` field on tracks: JSON list of `{start, end, ar, fr}`. *Done when:* a track can store synced text.
- [x] **2.5** `videos` collection (title, category, source file, HLS folder, poster, status). *Done when:* a video can be uploaded.
- [x] **2.6** Access rules: public can read published items; only admins can write. *Done when:* a logged-out request cannot create or edit anything.
- [x] **2.7** Seed script with 3 sample tracks (`scripts/seed-dev.ts`, local only; no sample video until ffmpeg is available). *Done when:* a fresh install has demo content.
- [x] **2.8** Chunked upload API in the web server: the browser sends files in 32 MB pieces (under Cloudflare's 100 MB limit), the server reassembles them and hands the file to PocketBase over the internal network. Resumes after a dropped connection. *Done when:* a 1 GB video uploads through Cloudflare.
- [x] **2.9** Minimal upload page using 2.8 (admin login, pick file, progress bar). *Done when:* a large file can be uploaded without the PocketBase panel.

## Phase 3 — Media worker

- [x] **3.1** Worker service that picks up new uploads from PocketBase (polls for `status = pending`). *Done when:* the worker logs each new upload.
- [x] **3.2** Audio: normalise loudness (-16 LUFS, two-pass) and encode to AAC (.m4a, plays everywhere). *Done when:* processed files are attached to the track.
- [x] **3.3** Audio: read duration and generate a waveform JSON. *Done when:* both are saved on the track.
- [x] **3.4** Video: convert to HLS in 360p / 720p / 1080p. *Done when:* the HLS folder plays in a test page.
- [x] **3.5** Video: generate a poster image and duration. *Done when:* both are saved on the video.
- [x] **3.6** Status updates (`processing` → `ready` / `error`) with the error message. *Done when:* the admin panel shows the status.
- [ ] **3.7** One-off bulk import of your existing files from a folder (`scripts/import-folder.ts`, ready to run). *Done when:* all current files are in the library.

## Phase 3b — Telegram bot

- [x] **3b.1** Bot reads links (YouTube, Instagram, TikTok, Facebook, direct files) and audio/video files posted in the group. *Done when:* each one gets a status reply.
- [x] **3b.2** Claude checks the content is relevant, picks the category and writes French/Arabic titles and the reciter. *Done when:* off-topic content is refused with a reason.
- [x] **3b.3** Download (yt-dlp, Telegram up to 2 GB via a local Bot API server), create the published track/video, skip duplicates. *Done when:* the same link posted twice is added once.
- [x] **3b.4** "Annuler" button for the sender and group admins; the status message turns to "En ligne" when the worker is done. *Done when:* a mistaken post can be removed from the group.
- [x] **3b.5** Set up the bot in Telegram and Coolify (token, group id, API id/hash, Anthropic key). *Done when:* a link posted in the group appears on the site.
- [ ] **3b.6** Home-PC downloader for YouTube (server addresses are blocked): a small program on an always-on PC fetches pending links from Sakina, downloads them from the home connection and uploads the result. No port to open at home. *Done when:* a YouTube link posted in the group is imported without cookies.

## Phase 4 — Public site and library

- [x] **4.1** Home page: featured content, categories, latest additions. *Done when:* it shows real content from PocketBase.
- [x] **4.2** Category page with a list of tracks and videos. *Done when:* each category lists its items.
- [x] **4.3** Track page (title, reciter, play button). *Done when:* each track has its own shareable URL.
- [x] **4.4** Reciter page. *Done when:* it lists all tracks by that reciter.
- [x] **4.5** Search in Arabic and French (ignoring diacritics). *Done when:* searching "دعاء" or "invocation" finds results.
- [x] **4.7** Full-width layout: main content, with the latest additions in a column beside it (below on phones). *Done when:* every page shows both.
- [x] **4.8** TV mode (smart TV browsers, or `?tv=1`): larger text, visible focus, arrow keys move between items, Back key goes back. *Done when:* the site can be used with a TV remote only.
- [x] **4.6** Page titles, descriptions and social previews. *Done when:* a shared link shows the title and image.

## Phase 5 — Sakina player (core)

- [ ] **5.1** Audio engine: play, pause, seek, speed, volume. *Done when:* a track plays from its page.
- [ ] **5.2** Persistent mini-player that keeps playing between pages. *Done when:* navigating doesn't stop the audio.
- [ ] **5.3** Lock-screen controls (Media Session API). *Done when:* play/pause works from the phone lock screen.
- [ ] **5.4** Queue: next, previous, repeat, shuffle. *Done when:* a category can be played as a playlist.
- [ ] **5.5** Fullscreen "immersive" view. *Done when:* tapping the mini-player opens it.
- [ ] **5.6** First WebGL background shader (slow gradient + soft light). *Done when:* it runs at 60 fps on a mid-range phone.
- [ ] **5.7** Make the background react to the audio (Web Audio analyser). *Done when:* it visibly breathes with the voice.
- [ ] **5.8** Add 3 more background themes (night sky, geometric pattern, water). *Done when:* the user can switch between 4 themes.
- [ ] **5.9** Synced text: show the current Arabic line with French below. *Done when:* text changes on time with the audio.
- [ ] **5.10** Text animation (fade/rise in, current word or line in gold). *Done when:* transitions are smooth and readable.
- [ ] **5.11** Settings: text size, show/hide French, show/hide Arabic. *Done when:* settings are remembered.
- [ ] **5.12** Fallback for weak devices (CSS gradient instead of WebGL). *Done when:* old phones still work.

## Phase 6 — Easy content adding

- [ ] **6.1** Simple admin page: drag-and-drop upload with title fields. *Done when:* a non-technical person can add a track.
- [ ] **6.2** Paste the full text (Arabic + French, one line each). *Done when:* the text is split into lines automatically.
- [ ] **6.3** Sync editor: play the audio and tap space at the start of each line. *Done when:* timings are saved.
- [ ] **6.4** Fine-tune timings by dragging on the waveform. *Done when:* a line can be shifted precisely.
- [ ] **6.5** Preview in the real player before publishing. *Done when:* the preview button opens the immersive view.
- [ ] **6.6** Publish / unpublish toggle. *Done when:* draft content is hidden from the public site.

## Phase 7 — Quran module

- [ ] **7.1** Import the 114 surahs with Arabic text (Tanzil, Uthmani). *Done when:* all verses are in the database.
- [ ] **7.2** Import the French translation (Hamidullah) after checking licence terms. *Done when:* each verse has French text.
- [ ] **7.3** Surah list and surah reading page. *Done when:* any surah can be read.
- [ ] **7.4** Import verse timings for 2–3 chosen reciters. *Done when:* a surah plays with synced verses automatically.
- [ ] **7.5** Play from any verse; repeat a verse (for memorisation). *Done when:* both work from the reading page.
- [ ] **7.6** Verse markers ۝ with the verse number in the player. *Done when:* they appear after each verse.

## Phase 8 — Video

- [ ] **8.1** Video player with hls.js (quality switch, fullscreen). *Done when:* uploaded videos play on phone and desktop.
- [ ] **8.2** Subtitles (WebVTT) in French and Arabic. *Done when:* subtitles can be toggled.
- [ ] **8.3** Chapters. *Done when:* the viewer can jump to a chapter.
- [ ] **8.4** Video pages in the library and search. *Done when:* videos appear alongside audio.

## Phase 9 — Web TV channels

- [ ] **9.1** `channels` collection (name, logo, playlist, start time, loop). *Done when:* a channel can be created.
- [ ] **9.2** Work out "what's on now" from the clock. *Done when:* two browsers show the same item at the same second.
- [ ] **9.3** TV page: fullscreen channel with now / next. *Done when:* a channel plays non-stop.
- [ ] **9.4** Weekly schedule (e.g. Al-Kahf on Fridays, morning adhkar at dawn). *Done when:* the schedule follows the day and time.
- [ ] **9.5** Programme guide page. *Done when:* the week's schedule is visible.

## Phase 10 — Live broadcasts

- [ ] **10.1** Add MediaMTX to Coolify (RTMP/SRT in, HLS out). *Done when:* OBS can stream to it.
- [ ] **10.2** Protect the stream with a secret key. *Done when:* streaming without the key is refused.
- [ ] **10.3** LIVE badge and live page that switches on automatically. *Done when:* starting OBS shows LIVE on the site.
- [ ] **10.4** Save each live broadcast and send it to the worker. *Done when:* the recording appears in the library.

## Phase 11 — Extras

- [ ] **11.1** Installable app (PWA) with offline downloads. *Done when:* a track plays in airplane mode.
- [ ] **11.2** Favourites and recently played (saved on the device). *Done when:* they survive a reload.
- [ ] **11.3** Optional accounts to sync favourites across devices. *Done when:* favourites appear on a second device.
- [ ] **11.4** Prayer-time-aware suggestions (adhkar of morning/evening). *Done when:* the home page changes with the time of day.
- [ ] **11.5** Export a short video clip for social media. *Done when:* a 30-second clip with text and background can be downloaded.

## Phase 12 — Launch

- [ ] **12.1** Privacy-friendly analytics (e.g. Umami). *Done when:* page views are counted without cookies.
- [ ] **12.2** Performance check on a mid-range phone. *Done when:* the home page loads in under 2 seconds on 4G.
- [ ] **12.3** Accessibility check (contrast, keyboard, screen reader). *Done when:* no major issues remain.
- [ ] **12.4** Credits and licences page (reciters, translation, fonts). *Done when:* every source is credited.
- [ ] **12.5** Launch. *Done when:* the site is public.

## Minimum first release

Phases 0, 1, 2, 3, 4, 5 and 6 give a working site where you can upload content and visitors can listen with the animated, synced player. Quran, video, TV and live come after.
