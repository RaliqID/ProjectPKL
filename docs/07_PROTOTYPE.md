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
