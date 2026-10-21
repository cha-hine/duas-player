FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
# Uploads arrive in 32 MB chunks (src/lib/upload-protocol.ts), so allow a bit more per request
ENV NODE_ENV=production PORT=3000 BODY_SIZE_LIMIT=48M UPLOAD_DIR=/data/uploads
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node", "build"]
