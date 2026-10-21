FROM node:24-alpine
# yt-dlp[default] includes yt-dlp-ejs, which YouTube needs (it runs with Node as the JS runtime)
RUN apk add --no-cache ffmpeg python3 py3-pip su-exec \
	&& pip install --no-cache-dir --break-system-packages "yt-dlp[default]"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV DATA_DIR=/data
# Sites change often: update yt-dlp at each start, then drop root privileges
CMD ["sh", "-c", "pip install -q -U --no-cache-dir --break-system-packages 'yt-dlp[default]' || true; mkdir -p /data && chown node:node /data && exec su-exec node node src/index.ts"]
