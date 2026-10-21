FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json ./
COPY src ./src
USER node
CMD ["node", "src/index.ts"]
