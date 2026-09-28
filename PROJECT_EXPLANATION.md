# SAKHA Finance Operations — Penjelasan Project

> **Sistem Informasi Pengelolaan Data dan Dokumen Finance**
> Prototype yang dikembangkan berdasarkan kegiatan PKL di **PT. Sakha Internasional**.

---

## Daftar Isi

1. [Ringkasan Singkat](#1-ringkasan-singkat)
2. [Latar Belakang](#2-latar-belakang)
3. [Tujuan & Manfaat](#3-tujuan--manfaat)
4. [Ruang Lingkup](#4-ruang-lingkup)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Alur Kerja Utama](#6-alur-kerja-utama)
7. [Modul & Fitur](#7-modul--fitur)
8. [Aturan Bisnis (Deterministik)](#8-aturan-bisnis-deterministik)
9. [Teknologi yang Digunakan](#9-teknologi-yang-digunakan)
10. [Cara Menjalankan](#10-cara-menjalankan)
11. [Akun Demo](#11-akun-demo)
12. [Screenshot](#12-screenshot)
13. [Pemetaan ke Pekerjaan PKL](#13-pemetaan-ke-pekerjaan-pkl)
14. [Keterbatasan & Kejujuran](#14-keterbatasan--kejujuran)

---

## 1. Ringkasan Singkat

**SAKHA Finance Operations** adalah sebuah *prototype* sistem informasi yang membantu
pengelolaan data dan dokumen pada bagian **Finance**. Sistem ini menghubungkan
transaksi, invoice, pembayaran, pengiriman, dokumen, arsip, dan verifikasi dalam
**satu alur kerja yang dapat ditelusuri** — sehingga tidak ada berkas atau data yang
tercecer di antara marketplace, spreadsheet, dan percakapan chat.

> ⚠️ **Penting:** Ini adalah **prototype pengembangan**, **bukan** sistem produksi
> resmi PT. Sakha Internasional. Seluruh data yang ditampilkan bersifat **contoh (fiktif)**.

---

## 2. Latar Belakang

Selama PKL di bagian administrasi Finance, pekerjaan sehari-hari melibatkan
banyak dokumen dan sumber data: invoice, resi, surat jalan, tanda terima, e-faktur,
purchase invoice, bukti pembayaran, data marketplace, Accurate, Excel, hingga arsip fisik.

Dari pengamatan tersebut muncul satu pola yang berulang:

> **Data & dokumen datang dari banyak sumber → harus dicek → dicocokkan → diinput →
> di-scan/rename → disimpan → di-filling → dimonitor → diverifikasi.**

Pola inilah yang menjadi dasar perancangan sistem: **data dan dokumen harus mengalir
melalui satu jalur yang tertata dan bisa ditelusuri kembali.**

---

## 3. Tujuan & Manfaat

| Tujuan | Manfaat |
|---|---|
| Menyatukan data dalam satu tempat | Tidak perlu bolak-balik antar file/spreadsheet |
| Menstandarkan penamaan & jenis dokumen | Berkas mudah ditemukan kembali |
| Melacak status dokumen & pembayaran | Menghindari invoice terlewat / resi hilang |
| Menyediakan pemeriksaan otomatis | Mengurangi kesalahan input yang tidak terdeteksi |
| Menyediakan arsip terstruktur | Memudahkan *filling* dan pencarian dokumen lama |
| Menyediakan laporan & analitik | Mendukung pengambilan keputusan |

---

## 4. Ruang Lingkup

Sistem ini **fokus pada administrasi Finance**, tidak melebar menjadi ERP penuh.

**Termasuk:**
- Transaksi, Invoice, Pembayaran (termasuk pencocokan), Pengiriman (resi & tanda terima)
- Dokumen (bulk Finance: invoice, e-faktur, surat jalan, resi, tanda terima, dll)
- Arsip dokumen terstruktur
- Verifikasi & Pemeriksaan Ketelitian
- Pengeluaran operasional (klaim bensin)
- Pengadaan barang ringan + Buku SPB
- Aktivitas (jejak audit) & Laporan

**Tidak termasuk** (di luar lingkup PKL Finance):
HR, Payroll, CRM, Manajemen Gudang, Inventori penuh, Akuntansi/Tax penuh,
Purchasing ERP penuh, hirarki persetujuan kompleks, atau fitur AI.

---

## 5. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────┐
│                    PENGGUNA (Browser)                 │
│         Landing Page  →  Aplikasi (SPA React)         │
└───────────────────────────┬──────────────────────────┘
                            │  HTTP (satu origin)
                            ▼
┌──────────────────────────────────────────────────────┐
│              LARAVEL (Backend + SPA hosting)          │
│  Routes → Middleware → Controller → Service → Model   │
│                                                       │
│  • Auth (session, 3 peran)                            │
│  • Service: Verification, Accuracy, PaymentMatch,     │
│             Analytics, Attention, Notification        │
│  • Jobs: SendScheduledReport (laporan terjadwal)      │
│  • PDF: dompdf (laporan siap cetak)                   │
└───────────────────────────┬──────────────────────────┘
                            │  Eloquent
                            ▼
┌──────────────────────────────────────────────────────┐
│                   PostgreSQL 17                       │
│  users · customers · transactions · invoices ·        │
│  payments · deliveries · documents · archives ·       │
│  expenses · procurements · verification_runs ·        │
│  activity_logs · notifications …                      │
└──────────────────────────────────────────────────────┘
```

**Prinsip kunci:**
- SPA di-*serve* dari **origin yang sama** dengan API → session/cookie aman, tanpa CORS rumit.
- Peran (ADMIN/OPERATOR/REVIEWER) **ditegakkan di server**, bukan hanya disembunyikan di UI.
- Pemeriksaan (verifikasi & ketelitian) memakai **aturan tetap**, bukan AI.

---

## 6. Alur Kerja Utama

```
TRANSAKSI
    ↓
INVOICE ──────────→ DOKUMEN (invoice, e-faktur, surat jalan, resi, tanda terima, …)
    ↓                     ↓
PEMBAYARAN ────→ PENCOCOKAN ──→ SESUAI / PERLU DIPERIKSA
    ↓
PENGIRIMAN (resi, tanda terima)
    ↓
VERIFIKASI  ──→ SESUAI / PERLU DIPERIKSA / TIDAK SESUAI
    ↓
ARSIP (Tahun → Bulan → Jenis → Pelanggan)
```

Proses pendukung:
```
PENGADAAN → INVOICE PEMBELIAN → DOKUMEN → ARSIP
PENGELUARAN (klaim bensin) → BUKTI → VERIFIKASI → ARSIP
```

---

## 7. Modul & Fitur

| Modul | Fungsi utama |
|---|---|
| **Beranda** | Ringkasan Finance: metrik, "Perlu Ditindaklanjuti", status dokumen, aksi cepat |
| **Transaksi** | Pusat pencatatan transaksi + halaman detail (invoice, pembayaran, pengiriman, dokumen, verifikasi, aktivitas) |
| **Invoice** | Daftar invoice lintas transaksi, jatuh tempo, status pembayaran |
| **Pembayaran** | Daftar pembayaran + tab **Pencocokan** (invoice vs pembayaran + selisih) |
| **Pengiriman** | Resi, ekspedisi, tanda terima |
| **Dokumen** | Unggah, pratinjau, unduh, verifikasi, arsipkan (15 jenis dokumen Finance) |
| **Arsip** | Arsip terstruktur + riwayat + unduh; pencarian & filter |
| **Verifikasi** | Hasil verifikasi per aturan, dengan penjelasan setiap temuan |
| **Pemeriksaan Ketelitian** | Audit deterministik 5 aspek input; SESUAI / PERLU DIPERIKSA / TIDAK SESUAI |
| **Analitik** | Tren per modul (5 tab): ringkasan, invoice & pembayaran, dokumen & arsip, verifikasi & ketelitian, pengeluaran & pengadaan |
| **Pengeluaran** | Klaim bensin & pengeluaran operasional (kendaraan, KM, SPBU, jenis BBM, nominal, bukti, status) |
| **Pengadaan** | Pengadaan barang ringan + Buku SPB (supplier, harga, jumlah, resi, status) |
| **Pelanggan** | Data pelanggan + detail |
| **Aktivitas** | Jejak audit lengkap (filter pengguna/entitas/tindakan/tanggal + pencarian) |
| **Laporan** | Semua laporan dalam satu tempat — **PDF · CSV · Email** |
| **Pengaturan** | Dokumen wajib · Sistem · **Preferensi** (tema & notifikasi) · Pengguna & Peran |

### Sorotan fitur
- **Tema Terang/Gelap** — pilihan tersimpan per akun, berlaku di seluruh halaman.
- **Laporan PDF** — berlogo, bernomor halaman, lengkap grafik (di-generate server via dompdf).
- **Email laporan** — kirim ke email sendiri + laporan otomatis terjadwal (harian/mingguan/bulanan).
- **Pencocokan pembayaran** — menampilkan **selisih rupiah** eksplisit, bukan sekadar status.

---

## 8. Aturan Bisnis (Deterministik)

Pemeriksaan **tidak memakai AI** — semua aturan tetap dan dapat dijelaskan.

### Verifikasi (8 pemeriksaan)
Pelanggan · Invoice · Nominal · Pembayaran · Kelengkapan dokumen · Resi ·
Tanggal · Duplikat → hasil: **SESUAI / PERLU DIPERIKSA / TIDAK SESUAI**.

### Pemeriksaan Ketelitian (5 aspek)
| Aspek | Yang diperiksa |
|---|---|
| Pelanggan | Pelanggan transaksi konsisten dengan invoice |
| Nomor Invoice | Ada dan tidak duplikat |
| Tanggal Invoice | Wajar terhadap tanggal transaksi |
| Nilai Invoice | Sama dengan nilai transaksi (selisih ditampilkan) |
| Kelengkapan Dokumen | Dokumen wajib sudah lengkap |

Ambang batas (`ambang perlu ditinjau`, `skor minimum`) dapat diubah di **Pengaturan → Sistem**.

### Pencocokan Pembayaran
- Nilai invoice = nilai pembayaran → **SESUAI**
- Ada selisih → **PERLU DIPERIKSA** (menampilkan nominal selisih)
- Belum ada pembayaran → **TIDAK SESUAI**

---

## 9. Teknologi yang Digunakan

| Lapisan | Teknologi |
|---|---|
| Backend | Laravel 13 (PHP 8.3) |
| Database | PostgreSQL 17 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (token warna, dark mode) |
| Auth | Session-based (Laravel Sanctum stateful) |
| PDF | barryvdh/laravel-dompdf |
| Email | SMTP (Laravel Mail) + Queue (driver database) |
| Pengujian | PHPUnit (51 test) |

---

## 10. Cara Menjalankan

**Prasyarat:** PHP 8.3+, Composer, Node 18+, PostgreSQL.

```powershell
# Cara termudah — klik dua kali run.cmd, atau dari terminal:
cd sakha-finance
.\dev.ps1 up          # PostgreSQL + Laravel API (port bebas 8650–8699)
.\start-all.ps1       # + queue worker + Vite dev server
```

Buka **http://127.0.0.1:8650** (port tercatat di `sakha-finance/.devport`).

```powershell
# Reset data contoh
php artisan migrate:fresh --seed
php artisan sakha:regenerate-documents

# Jalankan test
php artisan test      # 51 test

# Build frontend
cd spa; npm install; npm run build
```

---

## 11. Akun Demo

| Email | Peran | Kata sandi |
|---|---|---|
| `admin@sakha.test` | Administrator | `password` |
| `operator@sakha.test` | Operator | `password` |
| `reviewer@sakha.test` | Pemeriksa | `password` |

**Perbedaan peran (ditegakkan di server):**

| Peran | Dapat | Tidak dapat |
|---|---|---|
| **Administrator** | Akses penuh, kelola pengguna & pengaturan | — |
| **Operator** | Buat/ubah transaksi, dokumen, pembayaran, pengiriman | Verifikasi/tolak dokumen, ubah alur kerja, kelola pengguna |
| **Pemeriksa** | Verifikasi/tolak dokumen, tinjau hasil | Buat/ubah transaksi, catat pembayaran, unggah dokumen |

---

## 12. Screenshot

Semua tangkapan layar ada di folder [`presentation/screenshots/`](./screenshots).

**Mode Terang (23):**
`01-landing` · `02-login` · `03-register` · `04-beranda` · `05-transaksi` · `06-invoice` ·
`07-pembayaran` · `08-pembayaran-pencocokan` · `09-pengiriman` · `10-dokumen` · `11-arsip` ·
`12-verifikasi` · `13-ketelitian` · `14-analitik-ringkasan` · `15-pengeluaran` · `16-pengadaan` ·
`17-pelanggan` · `18-aktivitas` · `19-laporan` · `20-pengaturan-dokumen` · `21-pengaturan-sistem` ·
`22-pengaturan-preferensi` · `23-detail-transaksi`

**Mode Gelap (6):**
`24-dark-beranda` · `25-dark-analitik` · `26-dark-arsip` · `27-dark-ketelitian` ·
`28-dark-laporan` · `29-dark-preferensi`

---

## 13. Pemetaan ke Pekerjaan PKL

Sistem ini bukan mengarang fitur — setiap modul berangkat dari pekerjaan yang
benar-benar dilakukan/diamati selama PKL:

| Pekerjaan PKL | Diwujudkan menjadi |
|---|---|
| Update Payment | Modul **Pembayaran** + tab **Pencocokan** |
| Simpan Invoice / Purchase Invoice | Modul **Invoice** & **Dokumen** |
| Simpan Resi / Menyesuaikan Resi & Invoice | Modul **Pengiriman** (resi) + pencocokan |
| Filling Tanda Terima & Penerimaan | **Pengiriman** (tanda terima) |
| Scan / Rename / Filling Dokumen / Penyusunan Dokumen | Modul **Arsip** |
| Update Pengadaan Barang / Buku SPB | Modul **Pengadaan** |
| Claim Bensin | Modul **Pengeluaran** |
| Dashboard Ketelitian Input Sales Invoice | Modul **Pemeriksaan Ketelitian** |
| Pemeriksaan Invoice Lebih dari Satu | **Verifikasi** + pencocokan |
| Isi Dashboard Pengiriman | **Pengiriman** |
| Menyesuaikan e-Faktur / jurnal / BA | Jenis dokumen di **Dokumen** & **Arsip** |

---

## 14. Keterbatasan & Kejujuran

Agar presentasi dapat dipertanggungjawabkan, dipakai tiga label konsisten:

- **ACTUAL** — pekerjaan yang benar-benar dilakukan selama PKL.
- **OBSERVATION** — pola/alur yang diamati.
- **PROPOSED** — usulan perbaikan lewat project ini (**belum dipakai perusahaan**).

**Yang perlu dipahami:**

- Ini **prototype pengembangan**, **bukan** sistem produksi resmi PT. Sakha Internasional.
- Seluruh data bersifat **fiktif/contoh** — tidak ada data perusahaan asli maupun rahasia.
- Pemeriksaan bersifat **deterministik (aturan tetap)**, **bukan AI**.
- Email memakai **sandbox (Mailtrap)** untuk demo, bukan kotak surat produksi.
- Sistem dirancang **sempit dan relevan** (Finance), sengaja **bukan** ERP.

> Kalimat yang dapat dipakai saat presentasi:
> *"Ini berasal dari proses yang saya lakukan/lihat selama PKL, kemudian saya kembangkan
> menjadi fitur sistem — berupa prototype, belum sistem produksi, dan memakai data contoh."*

---

*Dibuat untuk laporan & presentasi PKL — PT. Sakha Internasional.*
