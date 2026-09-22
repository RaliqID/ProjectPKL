# 03 — WORKFLOW

> **Label:** workflow di bawah ini adalah **ACTUAL** (alur yang saya jalani),
> lalu dipetakan ke alur sistem DOCFLOW yang bersifat **PROPOSED**.

---

## 1. Workflow Utama (Makro)

Semua pekerjaan PKL saya mengikuti pola yang sama:

```text
DATA / DOKUMEN MASUK
        ↓
PENGECEKAN
        ↓
PENCOCOKAN DATA
        ↓
INPUT / UPDATE
        ↓
SCAN / RENAME
        ↓
PENYIMPANAN
        ↓
FILLING
        ↓
MONITORING
        ↓
VERIFIKASI
```

Ini yang menjadi tulang punggung desain DOCFLOW: satu alur, bisa ditelusuri dari awal ke akhir.

---

## 2. Delapan Workflow Nyata

### WF-1 — Invoice Marketplace (ACTUAL)
```text
Buka marketplace → Buka akun → Cek pesanan → Buka invoice
    → Cari transaksi → Lihat detail → Unduh invoice
    → Rename file → Tambah nomor bila perlu → Pindah ke folder
```

### WF-2 — Resi Pengiriman (ACTUAL)
```text
Login CS → Buka SAKA Group / JNE / JNT / SiCepat / AnterAja
    → Cari resi → Simpan resi → Rename (customer + ekspedisi + pembayaran)
    → Pindah ke folder RESI PENGIRIMAN → Pilih tahun → Nomor sesuai urutan
```

### WF-3 — Sales Marketplace → Accurate (ACTUAL)
```text
Buka Accurate → Existing company → Menu sales → Login akun PKL
    → Cari sales invoice → Sesuaikan tanggal → Buat transaksi baru
    → Input customer → Pilih DO → Hapus deskripsi/tax tak perlu
    → Sesuaikan nomor invoice → Buka PO/MP → Cek harga
    → Pindah data ke Accurate → Print → Save
```

### WF-4 — Scan → Rename → Folder → Filling (ACTUAL)
```text
Ambil DO → Buka aplikasi scanner → PDF scanner → Continuous scan
    → Scan → Buka folder download → Rename (nama customer)
    → Pindah ke folder Scan Delivery Order & Sales Invoice → Folder per tahun
```

### WF-5 — Payment (ACTUAL)
```text
Buka Excel → Buka dashboard payment → Buka WhatsApp CS
    → Cari info dana masuk → Cari nama customer → Copy data
    → Masukkan ke Excel → Sesuaikan jam & urutan → Update payment
    → Cari transaksi yang sama
```

### WF-6 — Pengadaan Barang (ACTUAL)
```text
Buka dashboard pengadaan → Cek data barang
    → Buka Tokopedia/Shopee → Cari barang → Cek gambar
    → Lihat detail transaksi → Catat nomor resi & kurir → Update status pengadaan
```

### WF-7 — Jurnal (ACTUAL)
```text
Ambil lampiran jurnal → Scan lampiran (tidak selalu cover)
    → Rename berdasarkan voucher → Satukan kembali sesuai urutan
    → Beri tanda "SC" → Buka folder PC OCA → Pindah ke folder scan dokumen
    → Sesuaikan tahun → Sesuaikan SD/SI → Sesuaikan jenis jurnal
```

### WF-8 — Tanda Terima (ACTUAL)
```text
Ambil tanda terima → Buka Accurate → Sales Receipts
    → Matikan Unreconciled Only → Filter tanggal → Buka Bill-To
    → Cari customer → Sesuaikan nomor invoice → Isi forms number
    → Sesuaikan dengan cash bank in
```

---

## 3. Pemetaan: Workflow PKL → Alur DOCFLOW (PROPOSED)

| Workflow PKL | Padanan di DOCFLOW |
|---|---|
| WF-1 Invoice | Transaction → Invoice + Document (type INVOICE) |
| WF-2 Resi | Document (type DELIVERY_ORDER) + Delivery (courier, tracking) |
| WF-3 Sales → Accurate | Transaction → Invoice (amount/tax) |
| WF-4 Scan → Rename → Folder → Filling | Document (upload, safe filename, versioning, per-transaction folder) |
| WF-5 Payment | Payment (partial, PENDING→CONFIRMED) + Verification (payment_balance) |
| WF-6 Pengadaan | Transaction + Delivery (tracking) |
| WF-7 Jurnal | Document (type JOURNAL) |
| WF-8 Tanda Terima | Delivery (DELIVERED) + Document (type RECEIPT) + Verification |

---

## 4. Workflow Engine (bagian dari DOCFLOW, PROPOSED)

DOCFLOW tidak mengizinkan lompatan status sembarangan. Transisi yang sah:

```text
DRAFT → PROCESSING → AWAITING_PAYMENT → PAID
PAID → PREPARING_DELIVERY → IN_DELIVERY → DELIVERED → COMPLETED

NEEDS_REVIEW dapat dicapai dari status aktif mana pun (ada masalah verifikasi)
CANCELLED mengakhiri alur
```

**Aturan completion (gabungan, harus terpenuhi semua):**
1. Invoice ada.
2. Payment sudah lunas.
3. Delivery ada dan berstatus DELIVERED.
4. Dokumen wajib ada (Invoice, Delivery Order, Payment Proof).
5. Verifikasi terakhir tidak punya check FAILED.

Jika ada yang gagal, sistem menampilkan **alasan**-nya, bukan sekadar "tidak bisa".

---

## 5. Workflow Verifikasi (Deterministik, PROPOSED)

```text
Jalankan verifikasi
    ↓
8 aturan dijalankan berurutan
    ↓
PASS / WARNING / FAILED per aturan + alasan
    ↓
Overall = status terburuk
    ↓
FAILED → transaksi pindah ke NEEDS_REVIEW + notifikasi
```

Aturan: Required Documents, Customer Consistency, Invoice Amount, Payment Balance,
Delivery Tracking, Date Consistency, Duplicate Document, Document File Validity.

---

## 6. Diagram

Lihat folder `docs/diagrams/`:
- `main-workflow.txt` — alur makro
- `transaction-lifecycle.txt` — siklus status transaksi
- `verification-flow.txt` — alur verification engine
