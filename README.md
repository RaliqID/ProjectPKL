# ProjectPKL — SAKHA FINANCE OPERATIONS

**Analisis workflow PKL + prototype Sistem Informasi Pengelolaan Data dan Dokumen Finance.**

Repo ini berisi dua hal:

1. **`docs/`** — dokumentasi case study PKL (jobdesk, workflow, masalah, improvement,
   usulan sistem, presentasi, Q&A sidang, audit kejujuran).
2. **`sakha-finance/`** — aplikasi full-stack yang **benar-benar jalan** (Laravel + PostgreSQL +
   React/TypeScript), sebagai prototype usulan. **Bukan sistem produksi resmi perusahaan, memakai data fiktif.**

> **Konteks resmi:** "Sistem Informasi Pengelolaan Data dan Dokumen Finance" — prototype yang
> dikembangkan berdasarkan kegiatan PKL di **PT. Sakha Internasional**. Bukan sistem internal
> produksi milik perusahaan, dan tidak memuat data perusahaan.

---

## Deploy

Aplikasi ini **tidak bisa** di-host di Vercel (Vercel tidak mendukung runtime PHP,
PostgreSQL persisten, queue worker, maupun scheduler). Gunakan host yang mendukung
Docker — **Render** (direkomendasikan, gratis) atau Railway/VPS.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Klik tombol di atas (atau: Render → **New** → **Blueprint** → pilih repo ini).
2. Render membaca `sakha-finance/render.yaml` dan membuat otomatis:
   web + queue worker + scheduler + PostgreSQL.
3. Setelah deploy pertama, isi `APP_URL` (URL `https://*.onrender.com` yang diberikan)
   dan kredensial email (`MAIL_MAILER=smtp` + `MAIL_*`) di dashboard.

Panduan lengkap: **[`sakha-finance/DEPLOY.md`](sakha-finance/DEPLOY.md)**.

---

## Menjalankan Aplikasi

Prasyarat: PHP 8.3+, Composer, Node 18+, PostgreSQL (sudah ada cluster lokal).

```powershell
cd sakha-finance
.\run.cmd              # cara termudah: klik dua kali run.cmd di Explorer
# atau dari terminal:
.\dev.ps1 up           # menyalakan PostgreSQL + Laravel API pada port bebas (8650-8699)
.\start-all.ps1        # PostgreSQL + API + queue worker + Vite SPA
```

Buka **http://127.0.0.1:8650** (port tercatat di `sakha-finance/.devport`), atau Vite dev di
**http://127.0.0.1:5173** jika memakai `start-all.ps1`.

**Akun demo** (password: `password`):
| Email | Peran |
|---|---|
| `admin@sakha.test` | Administrator |
| `operator@sakha.test` | Operator |
| `reviewer@sakha.test` | Pemeriksa |

### Perintah lain
```powershell
.\dev.ps1 status      # cek apa yang jalan
.\dev.ps1 down        # matikan Laravel API (PostgreSQL tetap jalan)
.\dev.ps1 pgdown      # matikan PostgreSQL juga
```

### Reset data contoh
```powershell
cd sakha-finance
php artisan migrate:fresh --seed
php artisan sakha:regenerate-documents   # regenerasi berkas PDF contoh
```

### Test backend
```powershell
cd sakha-finance
php artisan test      # 51 test, 152 assertion
```

### Build frontend (setelah ubah React)
```powershell
cd sakha-finance\spa
npm install
npm run build         # hasil ke sakha-finance/public
```

---

## Struktur

```text
ProjectPKL/
├── docs/                         # dokumentasi case study PKL
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_JOBDESK_ANALYSIS.md
│   ├── 03_WORKFLOW.md
│   ├── 04_PROBLEM_ANALYSIS.md
│   ├── 05_IMPROVEMENT.md
│   ├── 06_SYSTEM_PROPOSAL.md
│   ├── 07_PROTOTYPE.md
│   ├── 08_PRESENTATION.md
│   ├── 09_QA_SIDANG.md
│   ├── 11_FINAL_REVIEW.md
│   └── diagrams/
└── sakha-finance/                # aplikasi prototype
    ├── app/                      # Laravel (services, models, api)
    ├── database/                 # migrasi + seeder (data fiktif)
    ├── spa/                      # React + TypeScript + Tailwind
    ├── dev.ps1 / run.cmd         # kontrol dev stack
    └── public/                   # hasil build SPA
```

## Modul

Beranda · Transaksi · Invoice · Pembayaran · Pengiriman · Dokumen · Arsip ·
Verifikasi · Pemeriksaan Ketelitian · Pengeluaran · Pengadaan · Pelanggan · Aktivitas · Pengaturan

---

## Penting — Kejujuran

- **ACTUAL** = pekerjaan PKL saya (lihat `docs/02`).
- **OBSERVATION** = pengamatan saya (lihat `docs/04`).
- **PROPOSED** = usulan saya, **belum dipakai perusahaan** (lihat `docs/05`, `docs/06`, `docs/07`).

Tidak ada data perusahaan asli, tidak ada klaim automation/AI, tidak ada klaim
"aplikasi perusahaan". Semua tervalidasi di `docs/11_FINAL_REVIEW.md`.
