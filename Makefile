.PHONY: all api web cron

all: api web cron

api:
	cd apps/api && \
	encore build docker quanlyhocvien-cdhc2:test-cron --base=node:22-slim --config ./infra.config.json && \
	docker build -t quanlyhocvien-cdhc2:api .

web:
	docker build -t quanlyhocvien-cdhc2:web -f apps/web/Dockerfile .

cron:
	cd deploy/cron && \
	docker build -t quanlyhocvien-cdhc2:cron .

