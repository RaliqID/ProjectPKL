# Deploy ke Hugging Face Spaces (GRATIS, tanpa kartu)

Panduan ini untuk host **Hugging Face Spaces** — gratis, **tidak butuh kartu
kredit**, dan mendukung Docker. Cocok kalau Render/Railway minta kartu.

> **Konsekuensi paket gratis Spaces:** tidak ada PostgreSQL managed dan disk
> bersifat sementara. Karena itu versi ini memakai **SQLite** yang dibuat &
> di-*seed* otomatis setiap kali container start. Semua fitur (arsip, verifikasi,
> ketelitian, analitik, laporan PDF, tema) tetap berjalan. Data kembali ke kondisi
> awal saat container restart — cukup untuk demo/presentasi.

Semua berkas yang dibutuhkan **sudah ada** di repo:

| Berkas | Fungsi |
|---|---|
| `Dockerfile.hf` | Image khusus Spaces (SQLite, port 7860) |
| `docker/start-hf.sh` | Entrypoint: migrate + seed + serve |
| `README_HF.md` | README + metadata Spaces (sdk: docker) |

---

## Langkah 1 — Buat Space

1. Buka <https://huggingface.co/new-space> (login/buat akun HF gratis — pakai
   email, **tanpa kartu**).
2. Isi:
   - **Space name:** `sakha-finance-operations` (bebas)
   - **License:** `mit`
   - **Select the Space SDK:** pilih **Docker** → **Blank**
   - **Space hardware:** **CPU basic (free)**
   - **Visibility:** Public (atau Private)
3. Klik **Create Space**.

## Langkah 2 — Isi kode Space

Space dibuat sebagai repositori Git. Kamu perlu memasukkan isi folder
`sakha-finance/` ke dalamnya, dengan penyesuaian:

1. **`README_HF.md` → `README.md`** (Spaces membaca `README.md` untuk metadata).
2. **`Dockerfile.hf` → `Dockerfile`** (Spaces membaca `Dockerfile` di root).

### Cara A — lewat Git (disarankan)

```bash
# 1. Clone Space yang baru dibuat
git clone https://huggingface.co/spaces/<username>/sakha-finance-operations hf-space
cd hf-space

# 2. Salin isi sakha-finance ke sini (kecuali .git)
#    dari folder project:
#    (Windows PowerShell)
robocopy ..\ProjectPKL\sakha-finance . /E /XD .git vendor node_modules

# 3. Sesuaikan nama berkas untuk Spaces
#    (Linux/macOS)
mv README_HF.md README.md
mv Dockerfile.hf Dockerfile
#    (Windows)
#    ren README_HF.md README.md
#    ren Dockerfile.hf Dockerfile

# 4. Commit & push
git add .
git commit -m "Deploy SAKHA Finance Operations"
git push
```

### Cara B — lewat web HF

Di halaman Space → tab **Files** → **Add file** → **Upload files**, unggah isi
folder `sakha-finance/` (kecuali `vendor/` dan `node_modules/`), lalu:
- ubah nama `README_HF.md` menjadi `README.md`
- ubah nama `Dockerfile.hf` menjadi `Dockerfile`

## Langkah 3 — Tunggu build

Spaces otomatis build image (pertama kali ±5–10 menit: compile PHP + ekstensi +
build SPA). Setelah status **Running**, aplikasi bisa dibuka di:

```
https://<username>-sakha-finance-operations.hf.space
```

Login dengan `admin@sakha.test` / `password`.

## Langkah 4 — (opsional) set `APP_URL`

Kalau cookie sesi bermasalah, tambahkan **Variable** di Space:
**Settings → Variables and secrets** →
```
APP_URL = https://<username>-sakha-finance-operations.hf.space
```
lalu **Restart Space**.

---

## Ringkasan perbandingan host

| Host | Gratis? | Butuh kartu? | DB | Catatan |
|---|---|---|---|---|
| **Hugging Face Spaces** | ✅ | ❌ | SQLite | Paling mudah tanpa kartu |
| Render | ✅ | ✅ (verifikasi $1) | PostgreSQL | Fitur penuh |
| Railway | trial | ✅ | PostgreSQL | Trial habis |
| Vercel | ✅ | ❌ | — | **Tidak bisa** (no PHP) |

Repo ini menyiapkan **keduanya**: `Dockerfile.hf` (Spaces, SQLite) dan
`Dockerfile` + `render.yaml` (Render/Railway, PostgreSQL penuh).
