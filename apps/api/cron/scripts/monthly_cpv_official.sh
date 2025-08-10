#!/bin/sh
# File: ./cron/scripts/monthly_cpv_official.sh
# Monthly cpv official notification script

set -e

APP_URL="${APP_URL:-http://app:8080}"
ENDPOINT="/students/cron?event=cpvOfficialThisMonth"
TIMEOUT=30
MAX_RETRIES=3

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_app_health() {
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s --connect-timeout $TIMEOUT "${APP_URL}/healthz" > /dev/null 2>&1; then
            return 0
        fi
        retries=$((retries + 1))
        log "Health check failed, retry $retries/$MAX_RETRIES"
        sleep 5
    done
    return 1
}

main() {
    log "Starting monthly cpv official notification job"
    
    if ! check_app_health; then
        log "ERROR: App health check failed after $MAX_RETRIES attempts"
        exit 1
    fi
    
    log "Calling endpoint: ${APP_URL}${ENDPOINT}"
    
    if curl -f -s --connect-timeout $TIMEOUT -X GET "${APP_URL}${ENDPOINT}"; then
        log "SUCCESS: Monthly cpv official notification completed"
    else
        log "ERROR: Monthly cpv official notification failed"
        exit 1
    fi
}

main "$@"

