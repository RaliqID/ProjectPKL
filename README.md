# ProjectPKL — DOCFLOW

**Analisis workflow PKL + prototype sistem operasional dokumen & transaksi.**

Repo ini berisi dua hal:

1. **`docs/`** — dokumentasi case study PKL (jobdesk, workflow, masalah, improvement,
   usulan sistem, presentasi, Q&A sidang, audit kejujuran).
2. **`docflow/`** — aplikasi full-stack yang **benar-benar jalan** (Laravel + PostgreSQL +
   React/TypeScript), sebagai prototype usulan. **Bukan sistem perusahaan, pakai data fiktif.**

---

## Menjalankan Aplikasi

Prasyarat: PHP 8.3+, Composer, Node 18+, PostgreSQL (sudah ada cluster lokal).

```powershell
cd docflow
.\dev.ps1 up          # menyalakan PostgreSQL + Laravel API pada port bebas (8650-8699)
```

Buka **http://127.0.0.1:8650** (port tercatat di `docflow/.devport`).

**Akun demo** (password: `password`):
| Email | Role |
|---|---|
| `admin@docflow.test` | ADMIN |
| `operator@docflow.test` | OPERATOR |
| `reviewer@docflow.test` | REVIEWER |

### Perintah lain
```powershell
.\dev.ps1 status      # cek apa yang jalan
.\dev.ps1 down        # matikan Laravel API (PostgreSQL tetap jalan)
.\dev.ps1 pgdown      # matikan PostgreSQL juga
```

### Reset data contoh
```powershell
cd docflow
php artisan migrate:fresh --seed
```

### Test backend
```powershell
cd docflow
php artisan test      # 45 test, 130 assertion
```

### Build frontend (setelah ubah React)
```powershell
cd docflow\spa
npm install
npm run build         # hasil ke docflow/public
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
└── docflow/                      # aplikasi prototype
    ├── app/                      # Laravel (services, models, api)
    ├── database/                 # migrasi + seeder (data fiktif)
    ├── spa/                      # React + TypeScript + Tailwind
    ├── dev.ps1 / run-lib.ps1     # kontrol dev stack
    └── public/                   # hasil build SPA
```

---

## Penting — Kejujuran

- **ACTUAL** = pekerjaan PKL saya (lihat `docs/02`).
- **OBSERVATION** = pengamatan saya (lihat `docs/04`).
- **PROPOSED** = usulan saya, **belum dipakai perusahaan** (lihat `docs/05`, `docs/06`, `docs/07`).

Tidak ada data perusahaan asli, tidak ada klaim automation/AI, tidak ada klaim
"aplikasi perusahaan". Semua tervalidasi di `docs/11_FINAL_REVIEW.md`.
