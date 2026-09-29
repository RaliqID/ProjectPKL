#!/usr/bin/env sh
#
# Hugging Face Spaces entrypoint (free, no card).
#
# Spaces give no managed PostgreSQL and an ephemeral disk, so this mode uses a
# SQLite file: it is created, migrated and seeded on every container start.
# Data does not persist across restarts (it is demo data, so that is fine and
# keeps the database always clean).
#
set -e

# Writables Spaces needs.
mkdir -p storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs bootstrap/cache \
         database 2>/dev/null || true

# Generate a key if the Space did not set one.
if [ -z "$APP_KEY" ]; then
  echo "[hf] APP_KEY not set — generating one"
  php artisan key:generate --force || true
fi

DB_FILE="database/database.sqlite"
if [ ! -f "$DB_FILE" ]; then
  echo "[hf] creating SQLite database"
  touch "$DB_FILE"
fi

echo "[hf] running migrations..."
php artisan migrate --force --no-interaction

echo "[hf] seeding demo data..."
php artisan db:seed --force || true
php artisan sakha:regenerate-documents || true

echo "[hf] caching config, routes, views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Spaces expects the app on port 7860 by default (overridable via $PORT).
PORT="${PORT:-7860}"
echo "[hf] serving on 0.0.0.0:${PORT}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
