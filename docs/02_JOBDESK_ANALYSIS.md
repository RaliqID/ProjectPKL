# 02 — JOBDESK ANALYSIS (PHASE 0 AUDIT)

> **Label:** seluruh isi dokumen ini adalah **ACTUAL** (pekerjaan yang benar-benar saya lakukan),
> kecuali bagian *Catatan pengamatan* yang diberi label **OBSERVATION**.

Dokumen ini memetakan **29 pekerjaan (A–AC)** ke lima peta:
1. Jobdesk Map (kelompok kerja)
2. Workflow Map (alur makro)
3. Tools Map (alat yang dipakai)
4. Output Map (hasil nyata)
5. Problem Map (titik rawan/kesulitan)

---

## 1. JOBDESK MAP

Pekerjaan dikelompokkan menjadi **7 klaster**. Klaster ini dipakai konsisten di seluruh
project (termasuk di slide sidang).

### Klaster 1 — INVOICE & DOKUMEN VENDOR
| Kode | Pekerjaan |
|---|---|
| D | Simpan Invoice (marketplace) |
| E | Simpan Invoice Shopee |
| T | Rename E-Faktur Vendor & Filling Purchase Invoice |
| Y | Pemeriksaan Invoice Lebih dari Satu |
| AB | Selisih Harga Marketplace |

### Klaster 2 — RESI & PENGIRIMAN
| Kode | Pekerjaan |
|---|---|
| K | Simpan Resi |
| B | Isi Dashboard Pengiriman |
| G | Reminder Pengiriman |
| H | Print Alamat |
| O | Info Barang Datang |
| R | Tulis Nama Dokumen |
| V | Menyesuaikan Resi & Invoice |
| AA | Dokumen Beramplop |

### Klaster 3 — SALES & ACCURATE
| Kode | Pekerjaan |
|---|---|
| I | Input Sales Marketplace |
| N | Isi Dashboard Ketelitian |
| Z | Penyusunan Dokumen |
| AC | Filling BA |

### Klaster 4 — PAYMENT
| Kode | Pekerjaan |
|---|---|
| M | Update Payment |
| X | Menyesuaikan Tanda Terima & Penerimaan |
| L | Claim Bensin |

### Klaster 5 — PENGADAAN
| Kode | Pekerjaan |
|---|---|
| C | Update Pengadaan Barang |
| J | Buku SPB |

### Klaster 6 — SCAN & FILLING DOKUMEN
| Kode | Pekerjaan |
|---|---|
| F | Rapihin Dokumen |
| P | Scan Dokumen |
| Q | Filling Dokumen |
| S | Filling Tanda Terima |
| U | Filling Surat Jalan |
| W | Scan Journal |

### Klaster 7 — OPERASIONAL RUTIN LAIN
| Kode | Pekerjaan |
|---|---|
| A | Update Saldo E-Toll |

> **Catatan pengamatan (OBSERVATION):** klaster terbesar adalah **Resi & Pengiriman (8)**
> dan **Scan & Filling (6)**. Artinya porsi terbesar PKL saya memang di pengelolaan
> dokumen dan pengiriman, bukan coding.

---

## 2. WORKFLOW MAP (MAKRO)

Seluruh pekerjaan, apa pun klastеrnya, mengikuti pola yang sama:

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

Contoh penerapan pola ini per pekerjaan:

| Pekerjaan | Data masuk dari | Dicek di | Dicocokkan dengan | Output |
|---|---|---|---|---|
| D/E Invoice | Marketplace | Pesanan/Tagihan | Detail transaksi | File invoice tersimpan |
| K Resi | Website ekspedisi | Halaman resi | Customer & ekspedisi | File resi tersimpan |
| I Sales | Marketplace (PO/MP) | Accurate | Harga PO | Sales invoice terinput |
| M Payment | Dashboard + WhatsApp | Excel | Dana masuk | Data payment diperbarui |
| C Pengadaan | Dashboard pengadaan | Tokopedia/Shopee | Detail transaksi | Status pengadaan diperbarui |
| W Journal | Lampiran jurnal | Scanner | Nomor voucher | Journal terdigitalisasi |

Detail tiap workflow ada di `03_WORKFLOW.md`.

---

## 3. TOOLS MAP

Tools di bawah ini adalah yang **benar-benar saya pakai** (ACTUAL). Tidak ada tambahan
software lain.

| Pekerjaan | Tools |
|---|---|
| Sales | Accurate |
| Invoice (marketplace) | Marketplace (web) + File Explorer |
| Invoice (Shopee) | Shopee + File Explorer |
| Payment | Excel + WhatsApp + Dashboard Payment |
| Pengiriman | Dashboard Pengiriman (Chrome) + WhatsApp |
| Reminder pengiriman | WhatsApp |
| Resi | Website ekspedisi (SAKA Group / JNE / JNT / SiCepat / AnterAja) |
| Scanning | Aplikasi scanner + PDF scanner |
| Dokumen fisik | File Explorer + Bantex + bolong |
| Pengadaan | Marketplace (Tokopedia/Shopee) + Spreadsheet PO MP + Dashboard pengadaan |
| Journal | Scanner + Folder |
| E-Faktur / Purchase Invoice | File Explorer + Scanner |
| Monitoring | Dashboard (Finance / Pengiriman / Ketelitian) |
| Claim bensin | Excel + WhatsApp |
| E-Toll | eCHIS (HP CS) + buku catatan |
| Info barang datang | Tokopedia + grup departemen (WhatsApp) |
| Print alamat | Folder database customer + Print (page layout) |

Ringkasan alat: **Accurate, Excel/Spreadsheet, Marketplace, WhatsApp, Scanner, File Explorer,
Dashboard internal, Chrome, eCHIS.** Tidak ada tool lain.

---

## 4. OUTPUT MAP

Setiap pekerjaan menghasilkan output nyata. Hubungan pekerjaan → output:

| Pekerjaan | Output nyata |
|---|---|
| D Simpan Invoice | Invoice marketplace tersimpan di folder |
| E Simpan Invoice Shopee | File invoice Shopee tersimpan |
| T Rename E-Faktur | E-Faktur ter-rename + purchase invoice ter-filling (bantex A–L / M–Z) |
| K Simpan Resi | File resi tersimpan di folder RESI PENGIRIMAN |
| B Isi Dashboard Pengiriman | Dashboard pengiriman diperbarui |
| C Update Pengadaan | Status pengadaan diperbarui + nomor resi & kurir tercatat |
| I Sales | Sales invoice terinput di Accurate |
| M Update Payment | Data payment diperbarui di Excel + dashboard |
| N Dashboard Ketelitian | Dashboard ketelitian input sales diperbarui |
| P Scan Dokumen | DO & sales invoice ter-scan ke folder per tahun |
| Q Filling | Dokumen ter-filling di bantex sesuai urutan nomor |
| S Filling Tanda Terima | Tanda terima tersusun & ter-filling |
| U Filling Surat Jalan | Surat jalan ter-filling + diturunkan ke sales |
| W Scan Journal | Journal terdigitalisasi (folder scan dokumen, per tahun, SD/SI) |
| X Tanda Terima & Penerimaan | Data sales receipt disesuaikan dengan cash bank in |
| V Resi & Invoice | Resi disatukan dengan invoice terkait |
| L Claim Bensin | Data penggunaan bensin terinput di Excel |
| J Buku SPB | Buku SPB terisi + tertandatangan |
| F Rapihin Dokumen | Dokumen terpilah (DO / invoice / tanda terima) dan terurut |
| AC Filling BA | Bantex BA terisi |
| A Update Saldo E-Toll | Saldo tercatat di buku & tercocokkan |

> Pola output (OBSERVATION): hampir semua output berbentuk **"dokumen/data tersimpan di
> tempat yang benar dan bisa ditemukan lagi"**. Nilai utama pekerjaan saya adalah
> **ketertelusuran (traceability)**, bukan pembuatan fitur.

---

## 5. PROBLEM MAP

Titik rawan yang saya temui, dipetakan per klaster. Semua ini **OBSERVATION** — hal yang
saya alami/amati, bukan klaim masalah/kerugian perusahaan.

| # | Titik rawan | Klaster terkait | Kenapa rawan |
|---|---|---|---|
| P1 | Data tersebar di banyak sumber | Semua | Harus buka Accurate + Excel + marketplace + dashboard + WhatsApp bergantian |
| P2 | Pencocokan manual satu per satu | Invoice, Payment, Sales, Tanda Terima | Resi ↔ invoice, harga PO ↔ Accurate, tanda terima ↔ sales receipt |
| P3 | Penamaan file tidak seragam | Invoice, Resi, Scan, Journal | Download/scan menghasilkan nama file default, harus di-rename |
| P4 | Dokumen harus mudah ditemukan lagi | Filling, Dokumen | Berdasar tahun, bulan, customer, jenis, bantex |
| P5 | Pengecekan masih manual | Ketelitian, Pengadaan, Payment | Membandingkan angka/isi satu per satu |
| P6 | Update berkala pengiriman & payment | Pengiriman, Payment | Informasi berubah terus sepanjang hari |
| P7 | Risiko salah tulis | Sales, Invoice, Resi | Salah nama customer / nomor invoice / resi / tanggal → cek ulang |
| P8 | Dokumen fisik + digital harus sinkron | Scan, Filling | Urutan fisik (bantex) harus sama dengan urutan digital (folder) |

Hubungan P1–P8 dengan improvement & sistem usulan dijelaskan di `04_PROBLEM_ANALYSIS.md`
dan `05_IMPROVEMENT.md`.

---

## Ringkasan Audit (satu halaman)

- **29 pekerjaan** (A–AC) → **7 klaster**.
- **1 pola workflow** yang berulang (data masuk → cek → cocok → input → scan/rename → simpan → filling → monitoring → verifikasi).
- **~10 tools** yang benar-benar dipakai.
- **~21 output** yang semuanya bertema "tersimpan, tertelusur, terverifikasi".
- **8 titik rawan** yang berakar pada: data tersebar, pencocokan manual, penamaan file, risiko salah tulis.

Dari audit inilah project ini dibangun. **Tidak ada pekerjaan yang dikarang, tidak ada
tools yang ditambah, tidak ada masalah perusahaan yang dilebih-lebihkan.**
