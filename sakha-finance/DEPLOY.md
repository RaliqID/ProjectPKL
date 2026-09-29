# Panduan Deploy — SAKHA Finance Operations

> **Mengapa bukan Vercel?** Vercel tidak mendukung runtime PHP, PostgreSQL
> persisten, queue worker, maupun scheduler — semuanya dibutuhkan oleh aplikasi
> ini. Karena itu deploy memakai satu host yang mendukung Docker: **Railway**
> (alternatif: Render, Fly.io, VPS).

Aplikasi dijalankan sebagai **satu image** dengan tiga proses:

| Proses | Perintah | Kegunaan |
|---|---|---|
| Web | `start.sh web` | Melayani API + SPA (satu origin) |
| Worker | `start.sh worker` | Memproses antrean (email laporan terjadwal) |
| Scheduler | `start.sh scheduler` | Menjalankan jadwal (laporan harian/mingguan/bulanan) |

---

## Opsi A — Railway (disarankan, paling cepat)

### 1. Siapkan repository
Push project ke GitHub (folder `sakha-finance/` adalah root aplikasi).
Tambahkan juga **Dockerfile**, `railway.json`, dan `docker/start.sh` (sudah ada di repo).

### 2. Buat project di Railway
1. Buka <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
2. Pilih repo `ProjectPKL`.
3. Set **Root Directory** ke `sakha-finance`.
4. Railway akan mendeteksi `Dockerfile` dan mulai build.

### 3. Tambah database PostgreSQL
1. Di project yang sama: **New** → **Database** → **Add PostgreSQL**.
2. Railway otomatis menyediakan variabel `DATABASE_URL` /
   `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
3. Buka service aplikasi → **Variables** → tambahkan referensi:

```
DB_CONNECTION=pgsql
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_DATABASE=${{Postgres.PGDATABASE}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

### 4. Set variabel aplikasi
Di service aplikasi → **Variables**, tambahkan:

```
APP_NAME="SAKHA Finance Operations"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:xxxxxxxx   # generate lokal: php artisan key:generate --show
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://<domain-railway-anda>
APP_LOCALE=id
APP_FALLBACK_LOCALE=id

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<username-mailtrap>
MAIL_PASSWORD=<password-mailtrap>
MAIL_FROM_ADDRESS="noreply@sakha.test"
```

> **APP_KEY:** hasilkan sekali secara lokal lalu tempel:
> ```powershell
> php artisan key:generate --show
> ```

### 5. Deploy
Railway otomatis build & deploy. Setelah selesai:
1. Buka **Settings → Networking → Generate Domain** → dapat URL seperti
   `https://sakha-finance-production.up.railway.app`.
2. Isi `APP_URL` dengan URL tersebut (agar cookie & asset path benar), lalu redeploy.

### 6. Tambah worker & scheduler
Di project yang sama, **New** → **Deploy from GitHub repo** (repo yang sama),
lalu pada masing-masing service:
- **Settings → Build** → Dockerfile path `sakha-finance/Dockerfile`
- **Settings → Deploy → Custom Start Command:**
  - Service *worker*: `start.sh worker`
  - Service *scheduler*: `start.sh scheduler`
- Salin semua **Variables** aplikasi (DB + APP_*) ke keduanya
  (Railway bisa pakai *Shared Variables* / *Variable Reference*).

### 7. Isi data awal (sekali saja)
Buka **Railway → service web → Shell** (atau `railway run`):

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan sakha:regenerate-documents
```

Selesai — buka URL-nya, login dengan `admin@sakha.test` / `password`.

---

## Opsi B — Render

1. **New → Web Service** → connect repo → **Runtime: Docker**.
2. Root directory: `sakha-finance`.
3. **New → PostgreSQL** (Render menyediakan *Internal Database URL*).
4. Set variabel sama seperti langkah Railway (pakai kredensial DB Render).
5. Start command: `start.sh web`.
6. Tambah **Background Worker** (start `start.sh worker`) dan
   **Cron Job** (`start.sh scheduler`).

---

## Opsi C — VPS (Docker Compose)

Jalankan web + worker + scheduler + Postgres dalam satu `docker compose`:

```yaml
# docker-compose.yml (contoh, letakkan di dalam sakha-finance/)
services:
  app:
    build: .
    command: start.sh web
    ports: ["8080:8080"]
    env_file: [.env]
    depends_on: [db]
  worker:
    build: .
    command: start.sh worker
    env_file: [.env]
    depends_on: [db]
  scheduler:
    build: .
    command: start.sh scheduler
    env_file: [.env]
    depends_on: [db]
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: sakha_finance
      POSTGRES_USER: sakha
      POSTGRES_PASSWORD: ubah-ini
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force
```

---

## Catatan penting

- **APP_KEY** harus unik per environment dan **jangan** di-commit.
- **Kredensial SMTP** jangan ditulis ke file yang di-commit — pakai Variables host.
- **Health check** tersedia di `/up`.
- **Data seed bersifat fiktif** — aman untuk demo/presentasi.
- Untuk produksi sungguhan, ganti `php artisan serve` di `docker/start.sh`
  dengan `php-fpm` + Nginx (atau Laravel Octane).
- **Skala kecil:** satu instance web + satu worker + satu scheduler sudah cukup
  untuk demo PKL.
