FROM alpine:3.22
ARG PB_VERSION=0.40.5
ARG TARGETARCH=amd64
# mailcap provides /etc/mime.types, so HLS playlists and segments get proper content types
RUN apk add --no-cache ca-certificates mailcap unzip wget \
	&& wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" -O /tmp/pb.zip \
	&& unzip /tmp/pb.zip pocketbase -d /pb \
	&& rm /tmp/pb.zip
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
# pb_data holds the database and uploaded files: mount it as a volume.
# pb_public/media holds worker output (HLS video streams), shared with the worker.
VOLUME /pb/pb_data
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--publicDir=/pb/pb_public"]
