FROM quanlyhocvien-cdhc2:test-cron

RUN apt-get update && apt-get install -y --no-install-recommends curl tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && echo 'Asia/Ho_Chi_Minh' > /etc/timezone
