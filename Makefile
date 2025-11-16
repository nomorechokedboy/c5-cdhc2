.PHONY: all api web cron sms sms-api sms-web

all: api web cron sms

sms: sms-api sms-web

api:
	cd apps/api && \
	encore build docker quanlyhocvien-cdhc2:test-cron --base=node:22-slim --config ./infra.config.json && \
	docker build -t quanlyhocvien-cdhc2:api .

web:
	docker build -t quanlyhocvien-cdhc2:web -f apps/web/Dockerfile .

cron:
	cd deploy/cron && \
	docker build -t quanlyhocvien-cdhc2:cron .

sms-api:
	cd apps/sms-api && \
	encore build docker nomorechokedboy/web-project:sms-api

sms-web:
	docker build -t nomorechokedboy/web-project:sms-web -f apps/sms-web/Dockerfile .
