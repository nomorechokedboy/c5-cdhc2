FROM alpine:latest

RUN apk add --no-cache curl tzdata

COPY scripts /scripts

RUN chmod +x /scripts/*.sh && \
    cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo 'Asia/Ho_Chi_Minh' > /etc/timezone
