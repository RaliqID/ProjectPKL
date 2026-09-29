# SAKHA Finance Operations — production image
#
# One image serves both the web process and the queue worker / scheduler, so a
# single deploy host (Railway, Render, Fly.io, a VPS) can run the whole app.
#
# Build order matters: the SPA is compiled first (Node stage) and its output is
# copied into Laravel's public/ directory, so one origin serves both the API and
# the built React app — the same arrangement as local development.

# ---------------------------------------------------------------- frontend --
FROM node:22-alpine AS spa

WORKDIR /spa
COPY spa/package*.json ./
RUN npm ci
COPY spa/ ./
# Vite writes to ../public, which does not exist in this stage; build into dist
# and copy it across in the final stage instead.
RUN npm run build -- --outDir dist --emptyOutDir

# ------------------------------------------------------------------ vendor --
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
# Install production dependencies only (no dev tools in the runtime image).
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# ------------------------------------------------------------------- runtime --
FROM php:8.3-cli-alpine AS runtime

# Extensions Laravel + the app need: pdo_pgsql (database), gd (dompdf logo),
# mbstring / intl (Indonesian text), zip, bcmath (money maths).
RUN apk add --no-cache \
        postgresql-dev \
        libzip-dev \
        icu-dev \
        oniguruma-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        bash \
        curl \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        intl \
        mbstring \
        bcmath \
        opcache

# Composer is needed here to regenerate the autoloader once the full app tree is
# present (the vendor stage only sees composer.json/lock).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Application code + vendor from the build stages.
COPY . .
COPY --from=vendor /app/vendor ./vendor
# Built SPA (Vite output) goes into Laravel's public directory.
RUN rm -rf public/assets public/index.html \
    && cp -r /spa/dist/. ./public/

# Re-run the autoloader now that app code is present.
ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer dump-autoload --optimize --no-dev --no-interaction

# Writable dirs Laravel needs at runtime.
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
        storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Container entrypoint (web / worker / scheduler modes).
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

EXPOSE 8080

CMD ["start.sh"]
