FROM node:24-alpine
RUN apk add --no-cache ffmpeg su-exec
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV MEDIA_DIR=/media
# The shared media volume is created by Docker as root: hand it to the node user, then drop privileges
CMD ["sh", "-c", "mkdir -p /media/hls && chown node:node /media /media/hls && exec su-exec node node src/index.ts"]
