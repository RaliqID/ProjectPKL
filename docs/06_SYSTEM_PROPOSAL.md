# 06 — SYSTEM PROPOSAL

> **Label: PROPOSED.** Rancangan sistem. Belum dipakai perusahaan.

---

## 1. Nama & Tujuan

**SAKHA Finance Operations — Sistem Informasi Pengelolaan Data dan Dokumen Finance**

Tujuan: memusatkan transaksi, invoice, payment, pengiriman, dokumen, verifikasi, dan
riwayat ke satu alur yang bisa ditelusuri — supaya data tidak tersebar dan status tidak kabur.

Filosofi: **"One transaction, one source of operational context."**

---

## 2. Aktor & Hak Akses

| Role | Hak |
|---|---|
| **ADMIN** | Akses penuh, kelola user, kelola setting, override transisi workflow (dengan alasan) |
| **OPERATOR** | Buat/ubah transaksi, unggah dokumen, catat payment, buat delivery, jalankan verifikasi |
| **REVIEWER** | Tinjau hasil verifikasi, verify/reject dokumen, lihat audit trail |

Hak akses **ditegakkan di server**, bukan hanya menyembunyikan menu di frontend.

---

## 3. Entitas Data (PROPOSED)

```text
users                → akun + role
customers            → master customer
transactions         → entitas pusat
invoices             → tagihan milik transaksi
payments             → pembayaran (mendukung partial)
deliveries           → pengiriman (courier, tracking, status)
documents            → dokumen (jenis, nomor, status, versi)
document_versions    → riwayat versi file (tidak menimpa)
verification_runs    → hasil 1x verifikasi
verification_checks  → detail per aturan (PASS/WARNING/FAILED)
activity_logs        → audit trail
notifications        → notifikasi operasional
system_settings      → pengaturan
required_document_rules → dokumen mana yang wajib
```

---

## 4. Struktur Rancangan Tabel (ringkas)

### documents
| Kolom | Tipe |
|---|---|
| id | bigint PK |
| transaction_id | FK → transactions |
| document_type | enum (INVOICE, DELIVERY_ORDER, …) |
| original_filename | string |
| stored_filename | string |
| file_path | string |
| mime_type | string |
| file_size | bigint |
| document_number | string nullable |
| status | enum (UPLOADED, UNDER_REVIEW, VERIFIED, REJECTED, ARCHIVED) |
| current_version | int |
| uploaded_by | FK → users |

### transactions
| Kolom | Tipe |
|---|---|
| id | bigint PK |
| transaction_code | string unique |
| customer_id | FK → customers |
| transaction_date | date |
| status | enum |
| subtotal / discount / tax / total_amount | decimal(16,2) |
| created_by / updated_by | FK → users |

### transactions → invoices → payments
Perhatikan: payment **tidak menimpa** nilai. Setiap pembayaran adalah baris sendiri
(mendukung partial payment). Saldo dihitung: `total − Σ(confirmed payments)`.

### verification_runs / verification_checks
Satu run menyimpan 8 check. Setiap check menyimpan `rule_key`, `status`, `message`, dan
`metadata` (nilai yang dibandingkan).

---

## 5. Aturan Verifikasi (Deterministik)

| # | Aturan | PASS | WARNING | FAILED |
|---|---|---|---|---|
| 1 | Required Documents | semua dokumen wajib ada (sesuai tahap) | — | ada yang hilang |
| 2 | Customer Consistency | customer & invoice konsisten | invoice belum ada | customer tidak ada |
| 3 | Invoice Amount | total invoice = total transaksi | invoice belum ada | beda nominal |
| 4 | Payment Balance | lunas | belum ada / partial | bayar > total |
| 5 | Delivery Tracking | ada + ada tracking | belum dibuat (tahap awal) | hilang di tahap kirim |
| 6 | Date Consistency | semua tanggal konsisten | ada tanggal janggal | — |
| 7 | Duplicate Document | tidak ada duplikat | ada duplikat | — |
| 8 | Document File Validity | file ada & valid | belum ada dokumen / ada ditolak | file tidak ditemukan |

Overall = **status terburuk**. `FAILED` → transaksi → `NEEDS_REVIEW` + notifikasi.

---

## 6. Workflow Engine

Transisi sah saja yang diizinkan. Completion butuh **semua** syarat terpenuhi, dan
sistem menampilkan alasan jika belum bisa:

```json
{
  "allowed": false,
  "reasons": [
    "Delivery record is missing.",
    "Missing required document(s): Payment Proof.",
    "Verification has 2 failed check(s)."
  ]
}
```

---

## 7. Attention Queue

Menjawab pertanyaan: **"Apa yang perlu ditindak sekarang?"**
Setiap item punya `severity` yang **diturunkan dari kondisi nyata** (bukan label dekoratif).

---

## 8. Rancangan API (REST, ringkas)

```text
POST   /api/login                     POST   /api/logout        GET /api/me
GET    /api/overview                  GET    /api/search
GET    /api/transactions              POST   /api/transactions
GET    /api/transactions/{id}         PUT    /api/transactions/{id}
POST   /api/transactions/{id}/status  POST   /api/transactions/{id}/complete
GET    /api/transactions/{id}/completion-check
POST   /api/transactions/{id}/invoices
POST   /api/transactions/{id}/payments   POST /api/payments/{id}/confirm
POST   /api/transactions/{id}/deliveries POST /api/deliveries/{id}/status
GET    /api/documents                 POST   /api/transactions/{id}/documents
GET    /api/documents/{id}/preview    GET    /api/documents/{id}/download
POST   /api/documents/{id}/verify     POST   /api/documents/{id}/reject
GET    /api/transactions/{id}/verification       POST /api/transactions/{id}/verification/run
GET    /api/customers                 GET    /api/activity       GET /api/notifications
GET    /api/reports                   GET    /api/users          GET /api/settings
```

---

## 9. Keamanan (PROPOSED)

- Autentikasi sesi + CSRF (SPA same-origin).
- Otorisasi server-side per role.
- Validasi file: MIME + ekstensi + ukuran maksimum.
- Sanitasi nama file, cegah path traversal.
- Path filesystem **tidak** pernah diekspos ke client (download lewat controller ter-otorisasi).

> Semua di atas adalah **rancangan**. Prototype SAKHA Finance Operations mengimplementasikannya, tetapi
> sistem ini **bukan** produk perusahaan.
