# 04 — PROBLEM ANALYSIS

> Semua isi di dokumen ini adalah **OBSERVATION** — hal yang saya alami/amati selama PKL.
> Ini **bukan** klaim masalah atau kerugian perusahaan.

---

## Titik Rawan yang Ditemukan

### 1. Pencarian dokumen
Banyak dokumen membuat proses pencarian membutuhkan ketelitian. Semakin banyak bantex
dan folder, semakin lama waktu untuk menemukan dokumen tertentu.

### 2. Data tersebar
Data berasal dari beberapa aplikasi, folder, marketplace, spreadsheet, dan komunikasi
WhatsApp. Untuk satu proses saja, sering perlu berpindah antar sumber.

### 3. Verifikasi manual
Beberapa data harus dicocokkan satu per satu (resi ↔ invoice, harga PO ↔ Accurate,
tanda terima ↔ sales receipt).

### 4. Penamaan file
File hasil download atau scan sering bernama default, sehingga perlu di-rename agar konsisten.

### 5. Risiko human error
Kesalahan penulisan customer, nomor invoice, resi, tanggal, atau nama file dapat membuat
proses perlu diulang.

### 6. Update berkala
Informasi pengiriman dan payment berubah terus sepanjang hari sehingga perlu diperbarui berkala.

### 7. Dokumen fisik + digital harus sinkron
Urutan dokumen fisik (bantex) harus sesuai dengan urutan digital (folder).

### 8. Status tidak selalu terlihat
Sulit melihat sekilas transaksi mana yang sudah selesai dan mana yang masih tertahan.

---

## Problem Map (ringkas)

| # | Titik rawan | Klaster |
|---|---|---|
| P1 | Data tersebar di banyak sumber | Semua |
| P2 | Pencocokan manual satu per satu | Invoice, Payment, Sales, Tanda Terima |
| P3 | Penamaan file tidak seragam | Invoice, Resi, Scan, Journal |
| P4 | Dokumen harus mudah ditemukan lagi | Filling, Dokumen |
| P5 | Pengecekan masih manual | Ketelitian, Pengadaan, Payment |
| P6 | Update berkala pengiriman & payment | Pengiriman, Payment |
| P7 | Risiko salah tulis | Sales, Invoice, Resi |
| P8 | Dokumen fisik + digital harus sinkron | Scan, Filling |

---

## Dari Masalah → Rencana Perbaikan (PROPOSED)

| Masalah | Perbaikan yang diusulkan |
|---|---|
| P3 penamaan file | Standardisasi nama file `YYYY-MM-DD_CUSTOMER_JENIS_NOMOR` |
| P4 pencarian dokumen | Struktur folder tahun → jenis + satu sumber data |
| P1 data tersebar | Satu pusat data (SAKHA Finance Operations) sebagai *single source* |
| P2 & P5 verifikasi manual | Verification engine deterministik + checklist |
| P6 update berkala | Attention queue yang otomatis menandai hal yang perlu ditindak |
| P7 human error | Validasi server-side + alasan peringatan yang jelas |
| P8 sinkron fisik-digital | Dokumen diberi nomor & status, bisa ditelusuri |

Detail ada di `05_IMPROVEMENT.md` dan `06_SYSTEM_PROPOSAL.md`.

> **Catatan jujur:** perbaikan di atas adalah **usulan**. Perusahaan belum menerapkannya.
> Saya hanya membuat rancangan + prototype.
