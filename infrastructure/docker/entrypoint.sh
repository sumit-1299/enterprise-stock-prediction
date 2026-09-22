#!/bin/bash
set -e

# ==============================================================================
# Entrypoint script for Enterprise Stock Prediction Platform backend services.
# Supports: backend (Daphne ASGI), celery_worker, celery_beat, or custom commands.
# ==============================================================================

# Default connection parameters
DB_HOST="${POSTGRES_HOST:-${DB_HOST:-postgres}}"
DB_PORT="${POSTGRES_PORT:-${DB_PORT:-5432}}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Parse REDIS_URL if provided
if [ -n "$REDIS_URL" ]; then
    # Extract host and port from redis://host:port/db
    REDIS_HOST=$(echo "$REDIS_URL" | sed -e 's|^redis://||' -e 's|/.*$||' -e 's|:.*$||')
    REDIS_PORT=$(echo "$REDIS_URL" | sed -e 's|^redis://||' -e 's|/.*$||' | grep ':' | sed -e 's|^.*:||')
    REDIS_PORT="${REDIS_PORT:-6379}"
fi

echo "=========================================================="
echo "Starting Enterprise Stock Prediction Container"
echo "Target Command: $1"
echo "PostgreSQL:     ${DB_HOST}:${DB_PORT}"
echo "Redis:          ${REDIS_HOST}:${REDIS_PORT}"
echo "=========================================================="

wait_for_service() {
    local host=$1
    local port=$2
    local name=$3
    local max_retries=30
    local count=0

    echo "Waiting for ${name} at ${host}:${port}..."
    while ! python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2.0)
try:
    s.connect(('${host}', int(${port})))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        count=$((count + 1))
        if [ $count -ge $max_retries ]; then
            echo "ERROR: Timeout waiting for ${name} at ${host}:${port} after ${max_retries} attempts."
            exit 1
        fi
        sleep 2
    done
    echo "${name} is available!"
}

# Wait for essential backing services
wait_for_service "$DB_HOST" "$DB_PORT" "PostgreSQL"
wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"

case "$1" in
    backend)
        echo "Running database migrations..."
        python backend/manage.py migrate --noinput

        echo "Collecting static files..."
        python backend/manage.py collectstatic --noinput

        echo "Starting Daphne ASGI server on 0.0.0.0:8000..."
        exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
        ;;

    celery_worker)
        echo "Starting Celery worker..."
        exec celery -A config worker --loglevel=info
        ;;

    celery_beat)
        echo "Starting Celery Beat scheduler..."
        exec celery -A config beat --loglevel=info
        ;;

    *)
        echo "Executing custom command: $@"
        exec "$@"
        ;;
esac

