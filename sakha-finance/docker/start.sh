#!/usr/bin/env sh
#
# Container entrypoint for SAKHA Finance Operations.
#
# Runs as three interchangeable modes selected by the first argument so a single
# image can serve the web process, the queue worker and the scheduler:
#
#   start.sh            -> web (default): migrate, seed-if-empty, cache, serve
#   start.sh worker     -> php artisan queue:work
#   start.sh scheduler  -> php artisan schedule:work
#
# Works on any host that gives the container a $PORT (Render, Railway, Fly.io)
# or falls back to 8080.
#
set -e

# The built SPA and uploaded documents need writable storage at runtime.
mkdir -p storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs bootstrap/cache 2>/dev/null || true

# Generate an app key if the host did not provide one, so the container can boot
# in a pinch. In production APP_KEY should be set via environment variables.
if [ -z "$APP_KEY" ]; then
  echo "[start] APP_KEY not set — generating a temporary one"
  php artisan key:generate --force || true
fi

run_migrations() {
  echo "[start] running migrations..."
  php artisan migrate --force --no-interaction
}

seed_if_empty() {
  # Seed the demo data only when the database has no users yet, so redeploys do
  # not wipe or duplicate anything an operator has entered.
  USERS=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -n1 | tr -dc '0-9')
  if [ "${USERS:-0}" = "0" ]; then
    echo "[start] empty database — seeding demo data..."
    php artisan db:seed --force || true
    php artisan sakha:regenerate-documents || true
  else
    echo "[start] database already has ${USERS} user(s) — skipping seed"
  fi
}

cache_app() {
  echo "[start] caching config, routes and views..."
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
}

MODE="${1:-web}"

case "$MODE" in
  worker)
    echo "[start] queue worker"
    exec php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    ;;
  scheduler)
    echo "[start] scheduler"
    exec php artisan schedule:work
    ;;
  *)
    run_migrations
    seed_if_empty
    cache_app
    PORT="${PORT:-8080}"
    echo "[start] web server on 0.0.0.0:${PORT}"
    # Laravel's serve command is enough for a prototype demo; the platform
    # terminates TLS in front of it.
    exec php artisan serve --host=0.0.0.0 --port="${PORT}"
    ;;
esac
