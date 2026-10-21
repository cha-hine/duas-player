FROM node:24-alpine
# yt-dlp[default] includes yt-dlp-ejs, which YouTube needs (it runs with Node as the JS runtime)
RUN apk add --no-cache ffmpeg python3 py3-pip \
	&& pip install --no-cache-dir --break-system-packages --root-user-action=ignore "yt-dlp[default]"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV DATA_DIR=/data
# Runs as root: the local Telegram Bot API server writes downloaded files into folders only
# its own user can open, and the bot must read (then delete) them from the shared volume.
# Sites change often, so yt-dlp is updated at each start.
CMD ["sh", "-c", "pip install -q -U --no-cache-dir --break-system-packages --root-user-action=ignore 'yt-dlp[default]' || true; mkdir -p /data && exec node src/index.ts"]
