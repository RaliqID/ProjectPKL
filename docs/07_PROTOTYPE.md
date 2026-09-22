# 07 — PROTOTYPE (DOCFLOW)

> **Label: PROPOSED.** Ini prototype yang saya bangun sebagai gambaran usulan.
> **Bukan** sistem perusahaan, pakai data fiktif, tidak dipakai production.

---

## 1. Apa Ini

Aplikasi web full-stack yang bekerja nyata (bukan mockup). Tujuannya
**memvisualisasikan** bagaimana proses manual yang saya temui bisa dibuat lebih terstruktur
dan bisa ditelusuri.

---

## 2. Stack

| Lapisan | Teknologi |
|---|---|
| Backend | Laravel 13 (PHP 8.3) |
| Database | PostgreSQL 17 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (design token kustom) |
| Auth | Laravel Sanctum (session SPA) |
| Testing | PHPUnit (45 test, 130 assertion) |

---

## 3. Arsitektur Backend

```text
app/
├── Enums/              → TransactionStatus, DocumentType, PaymentStatus, ...
├── Models/             → 14 model Eloquent
├── Services/
│   ├── TransactionService     → buat/ubah + hitung total (server-side!)
│   ├── PaymentService         → partial payment, sinkron status invoice
│   ├── DocumentService        → upload, sanitasi nama, versi, verify/reject
│   ├── DeliveryService        → pengiriman + transisi status
│   ├── VerificationService    → orkestrasi 8 aturan
│   │   └── Rules/             → RequiredDocuments, InvoiceAmount, PaymentBalance, ...
│   ├── WorkflowService        → gerbang completion + transisi sah
│   ├── AttentionService       → attention queue + severity
│   ├── ActivityLogService     → audit
│   └── NotificationService    → notifikasi
├── Http/
│   ├── Controllers/Api/       → 14 controller (thin)
│   ├── Requests/              → validasi
│   └── Resources/             → format respons konsisten
```

Total nilai dihitung ulang **di server** — frontend tidak dipercaya untuk total.

---

## 4. Arsitektur Frontend

```text
spa/src/
├── components/ui/      → DataTable, StatusBadge, Modal, Button, Form, States, Metric, Filters
├── components/         → GlobalSearch, NotificationPanel
├── layouts/AppShell    → sidebar + topbar
├── features/transactions/ → CreateTransactionModal, VerificationPanel, DocumentList, ActivityTimeline
├── pages/              → Login, Overview, Transactions, TransactionDetail,
│                         Documents, Payments, Deliveries, Customers, CustomerDetail,
│                         Verification, Activity, Settings, NotFound
├── lib/                → api client, auth, toast, hooks (react-query), status config, format
└── types/              → tipe API
```

**Prinsip desain:** minimal, profesional, tenang, rapi, banyak whitespace, hierarki jelas,
satu warna aksen (indigo) yang restrained, warna hanya untuk status yang bermakna.

---

## 5. Fitur yang Benar-Benar Jalan

| Fitur | Status |
|---|---|
| Login/logout + sesi (tahan refresh) | ✅ |
| **Registrasi akun (self sign-up)** | ✅ |
| **Realtime — auto-refresh + indikator "Live · Ns ago"** | ✅ |
| **Landing page profesional (publik di `/`)** | ✅ |
| **Logo brand + favicon** | ✅ |
| **Dokumen per jenis (11 tab: Invoice → Journal → BA → Other)** | ✅ |
| **Perbedaan role terlihat di UI (badge + banner + aksi ter-gate)** | ✅ |
| Role ADMIN/OPERATOR/REVIEWER (server-side) | ✅ |
| Overview "apa yang perlu ditindak" (query nyata) | ✅ |
| Attention queue (severity dari kondisi nyata) | ✅ |
| Transaksi: list, search, filter, pagination, detail | ✅ |
| Buat transaksi multi-langkah (total dihitung server) | ✅ |
| Invoice | ✅ |
| Payment termasuk **partial** + confirm/reject | ✅ |
| Delivery + transisi status + tracking | ✅ |
| Dokumen: upload, preview, download, **versi**, verify/reject/archive | ✅ |
| Verification engine (8 aturan, PASS/WARNING/FAILED, alasan) | ✅ |
| Workflow engine (transisi sah + completion gate beralasan) | ✅ |
| Activity log (audit) + timeline | ✅ |
| Notifikasi + unread count | ✅ |
| Reports + export CSV | ✅ |
| Settings (dokumen wajib, sistem, user) | ✅ |
| Tema responsif (desktop + mobile) | ✅ |

---

## 5b. Landing Page, Registrasi & Realtime

**Landing page (`/`)** — halaman publik profesional yang menjelaskan produk:
hero, problem (before/with), features, showcase verification engine, how it works,
roles, CTA, footer. Aplikasi utama ada di `/app`, jadi pengunjung bisa melihat
gambaran dulu sebelum masuk.

**Registrasi (`/register`)** — pengguna bisa membuat akun sendiri (nama, email,
password + konfirmasi, pilih role Operator/Reviewer). Akun **tidak bisa**
menunjuk dirinya sebagai ADMIN — hanya admin yang boleh memberikan role itu.
Setelah daftar, langsung login otomatis.

**Realtime** — DOCFLOW tidak memakai websocket, tapi data yang paling sering berubah
(overview, verification queue, activity) di-*poll* berkala lewat React Query.
Indikator di topbar menunjukkan **"Live · Ns ago"** yang benar-benar menghitung
waktu sejak refresh terakhir, dan bisa diklik untuk refresh manual.

---

## 5c. Perbedaan Role (Jelas & Terlihat)

| Kemampuan | ADMIN | OPERATOR | REVIEWER |
|---|:--:|:--:|:--:|
| Lihat dashboard & data | ✅ | ✅ | ✅ |
| Buat/ubah transaksi | ✅ | ✅ | ❌ |
| Catat payment & delivery | ✅ | ✅ | ❌ |
| Upload dokumen | ✅ | ✅ | ❌ |
| Verify / reject dokumen | ✅ | ❌ | ✅ |
| Jalankan verifikasi | ✅ | ✅ | ✅ |
| Override status workflow | ✅ | ❌ | ❌ |
| Kelola user & setting | ✅ | ❌ | ❌ |

Perbedaan ini **ditampilkan** di UI:
- **Role badge** di topbar (klik → lihat daftar "Can" & "Locked").
- **Banner** di halaman transaksi untuk role read-only.
- **Tombol aksi** yang tidak diizinkan disembunyikan/disabled (bukan error diam-diam).
- Server tetap menegakkan otorisasi (UI hanya lapisan tampilan).

---

## 5d. Dokumen per Jenis

Halaman Documents punya **11 tab**: All, Invoice, Delivery Order, Receipt, Payment Proof,
Tax Invoice, Purchase Order, Sales Order, **Journal**, Berita Acara (BA), dan Other —
mengikuti pekerjaan operasional nyata (invoice, resi, jurnal, BA, dsb).
Data seed mengisi **semua** jenis supaya tiap tab ada isinya dan bisa didemonstrasikan.

---

## 5e. Alur End-to-End yang Terverifikasi

Satu transaksi diuji penuh dari nol sampai selesai (nyata, bukan mock):

```text
Create (DRAFT) → PROCESSING → AWAITING_PAYMENT
        → Invoice
        → Payment lunas  → otomatis PAID
        → PREPARING_DELIVERY → Delivery (courier + tracking)
        → Upload 3 dokumen wajib (Invoice, DO, Payment Proof)
        → SHIPPED → IN_TRANSIT → DELIVERED
        → Verification = PASS (score 100)
        → Completion gate = allowed
        → COMPLETED  ✅
```

Setiap langkah tercatat di **Activity timeline** (audit), dan transaksi
yang belum lengkap **diblokir** dengan alasan yang jelas.

---

## 6. Data Seed (fiktif)
- 24 customer fiktif, 59 transaksi, 59 invoice, 65 payment, 26 delivery, 112 dokumen.
- **7 skenario sengaja dibuat** untuk menunjukkan verifikasi & attention:

| Skenario | Transaksi | Hasil |
|---|---|---|
| A. Sehat | TRX-DEMO-A-HEALTHY | PASS (score 100), COMPLETED |
| B. Dokumen hilang | TRX-DEMO-B-MISSING-DOC | FAILED, NEEDS_REVIEW |
| C. Nominal payment tidak cocok | TRX-DEMO-C-PAYMENT-MISMATCH | FAILED |
| D. Payment partial | TRX-DEMO-D-PARTIAL-PAYMENT | WARNING |
| E. Invoice jatuh tempo | TRX-DEMO-E-OVERDUE | FAILED / attention |
| F. Pengiriman terlambat | TRX-DEMO-F-DELAYED | WARNING / attention |
| G. Invoice duplikat | TRX-DEMO-G-DUPLICATE | WARNING |

Semua nama customer, nomor invoice, dan nomor resi **fiktif**.

---

## 7. Cara Menjalankan

```powershell
cd C:\Users\raso8\ProjectPKL\docflow
.\dev.ps1 up
```
Buka `http://127.0.0.1:8650` (port dicatat di `.devport`).
- `/` → landing page
- `/register` → daftar akun baru
- `/login` → masuk
- `/app` → aplikasi (butuh login)

**Akun demo** (semua password: `password`):
- `admin@docflow.test` — ADMIN
- `operator@docflow.test` — OPERATOR
- `reviewer@docflow.test` — REVIEWER

---

## 8. Batasan Prototype (jujur)

- **Bukan** sistem production perusahaan.
- Tidak ada integrasi ke marketplace / Accurate / WhatsApp asli.
- Verification engine **deterministik** — tidak memakai AI/OCR.
- Storage file lokal (arsitektur disiapkan agar bisa pindah ke S3 di masa depan).
- Data seed hanyalah contoh untuk demonstrasi.
