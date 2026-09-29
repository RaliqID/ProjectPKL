#!/usr/bin/env sh
#
# Container entrypoint for SAKHA Finance Operations.
#
# Runs as three interchangeable modes selected by the first argument so a single
# image can serve the web process, the queue worker and the scheduler:
#
#   start.sh            -> web (default): migrate, cache config, serve
#   start.sh worker     -> php artisan queue:work
#   start.sh scheduler  -> php artisan schedule:work
#
set -e

run_migrations() {
  echo "[start] running migrations..."
  php artisan migrate --force --no-interaction || true
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
    php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    ;;
  scheduler)
    echo "[start] scheduler"
    php artisan schedule:work
    ;;
  *)
    run_migrations
    cache_app
    PORT="${PORT:-8080}"
    echo "[start] web server on 0.0.0.0:${PORT}"
    # PHP's built-in server is fine for a prototype demo on a single host. In
    # front of it the platform terminates TLS.
    exec php artisan serve --host=0.0.0.0 --port="${PORT}"
    ;;
esac
