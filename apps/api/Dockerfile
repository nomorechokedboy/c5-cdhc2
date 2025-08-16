FROM quanlyhocvien-cdhc2:test-cron

ENV TZ=Asia/Ho_Chi_Minh

RUN apt-get update && apt-get install -y --no-install-recommends curl tzdata \
    && rm -rf /var/lib/apt/lists/* 


RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
