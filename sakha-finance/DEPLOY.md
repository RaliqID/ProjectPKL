# Panduan Deploy — SAKHA Finance Operations

> **Mengapa bukan Vercel?** Vercel tidak mendukung runtime PHP, PostgreSQL
> persisten, queue worker, maupun scheduler — semuanya dibutuhkan oleh aplikasi
> ini. Karena itu deploy memakai host yang mendukung Docker: **Render**
> (disarankan, gratis) atau Railway / Fly.io / VPS.

Aplikasi dijalankan sebagai **satu image** dengan tiga proses:

| Proses | Perintah | Kegunaan |
|---|---|---|
| Web | `start.sh web` | Melayani API + SPA (satu origin) |
| Worker | `start.sh worker` | Memproses antrean (email laporan terjadwal) |
| Scheduler | `start.sh scheduler` | Menjalankan jadwal (laporan harian/mingguan/bulanan) |

---

## Opsi A — Render (disarankan, gratis, 1 klik)

Repo sudah menyertakan **`render.yaml`** (Blueprint) yang membuat **semua** service
sekaligus: web + queue worker + scheduler + PostgreSQL.

### 1. Deploy lewat Blueprint

1. Buka <https://dashboard.render.com/blueprints> → **New Blueprint Instance**.
2. Hubungkan akun GitHub dan pilih repo `RaliqID/ProjectPKL`.
3. Render membaca `sakha-finance/render.yaml` dan menampilkan daftar service:
   - `sakha-finance` (Web, Docker)
   - `sakha-worker` (Background Worker)
   - `sakha-scheduler` (Background Worker)
   - `sakha-db` (PostgreSQL, gratis)
4. Klik **Apply**. Render membuat database, mengisi kredensial DB ke semua
   service secara otomatis, lalu build & deploy.

> **Root Directory:** jika Render meminta, set ke `sakha-finance`
> (Blueprint sudah menunjuk `dockerContext: ./sakha-finance`).

### 2. Setelah deploy pertama

1. Buka service **sakha-finance** → salin URL-nya
   (mis. `https://sakha-finance.onrender.com`).
2. Masuk **Environment** → tambahkan:
   ```
   APP_URL=https://sakha-finance.onrender.com
   ```
   (WAJIB — kalau salah, cookie sesi & asset path bermasalah.)
3. (Opsional, untuk email sungguhan) ganti `MAIL_MAILER` ke `smtp` dan isi:
   ```
   MAIL_MAILER=smtp
   MAIL_HOST=sandbox.smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=<username-mailtrap>
   MAIL_PASSWORD=<password-mailtrap>
   ```
4. Simpan → Render redeploy otomatis.

### 3. Data awal

`start.sh` sudah otomatis:
- menjalankan **migrasi** (`php artisan migrate --force`),
- **mengisi data contoh** kalau database masih kosong (`db:seed`),
- membuat berkas PDF contoh.

Jadi setelah deploy selesai, tinggal buka URL dan login dengan
`admin@sakha.test` / `password`.

> **Catatan paket gratis Render:** service gratis "tidur" setelah ~15 menit tanpa
> trafik dan bangun lagi saat diakses (butuh ±30 detik). Database gratis punya
> masa aktif terbatas. Cukup untuk demo/presentasi; upgrade bila perlu selalu hidup.

---

## Opsi B — Railway

Repo juga menyertakan **`railway.json`**. Langkah:

### 1. Buat project di Railway
1. Buka <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
2. Pilih repo `ProjectPKL`, set **Root Directory** = `sakha-finance`.
3. Railway mendeteksi `Dockerfile` dan mulai build.

### 2. Tambah database PostgreSQL
1. **New** → **Database** → **Add PostgreSQL**.
2. Di service aplikasi → **Variables**, tambahkan referensi:
```
DB_CONNECTION=pgsql
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_DATABASE=${{Postgres.PGDATABASE}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

### 3. Set variabel aplikasi
```
APP_NAME="SAKHA Finance Operations"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:xxxxxxxx   # php artisan key:generate --show
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://<domain-railway-anda>
APP_LOCALE=id
APP_FALLBACK_LOCALE=id
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=database
CACHE_STORE=database
MAIL_MAILER=log           # ganti ke smtp bila perlu email sungguhan
MAIL_FROM_ADDRESS="noreply@sakha.test"
```

### 4. Tambah worker & scheduler
Buat dua service lagi dari repo yang sama:
- **Custom Start Command:** `start.sh worker` (worker)
- **Custom Start Command:** `start.sh scheduler` (scheduler)
- Salin semua Variables ke keduanya.

### 5. Generate domain
**Settings → Networking → Generate Domain**, lalu isi `APP_URL` dengan URL itu.

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
