# 05 — IMPROVEMENT PLAN

> **Label: PROPOSED.** Semua di dokumen ini adalah usulan saya. Belum diterapkan perusahaan.

Dibagi dua: **Quick Wins** (bisa dilakukan manual tanpa aplikasi baru) dan
**System Improvement** (butuh sistem seperti SAKHA Finance Operations).

---

## A. QUICK WINS (tanpa aplikasi baru)

### A1. Standardisasi penamaan file
**Format:**
```text
YYYY-MM-DD_CUSTOMER_JENISDOKUMEN_NOMOR
```
**Contoh:**
```text
2026-05-12_CUSTOMER-ABC_INVOICE_INV001.pdf
2026-05-12_CUSTOMER-ABC_RESI_JNE123456.pdf
2026-05-12_CUSTOMER-ABC_DO_DO-2026-00042.pdf
```
**Aturan:**
- Tanggal transaksi/dokumen (bukan tanggal download).
- Nama customer disingkat, huruf kapital, tanpa spasi (pakai `-`).
- Jenis dokumen: INVOICE, RESI, DO, EFAKTUR, JOURNAL, RECEIPT, PAYMENT.
- Nomor: nomor invoice/resi/voucher asli.

### A2. Struktur folder
```text
DOCUMENT
├── 2026
│   ├── INVOICE
│   ├── RESI
│   ├── E-FAKTUR
│   ├── JOURNAL
│   ├── PURCHASE
│   └── DELIVERY
├── CUSTOMER
└── ARCHIVE
```
Tujuan: semua orang mencari di tempat yang sama, mengikuti tahun lalu jenis.

### A3. Checklist verifikasi (sebelum dokumen dianggap selesai)
```text
[ ] Customer benar & sesuai dokumen
[ ] Nomor invoice benar
[ ] Tanggal sesuai
[ ] Nomor resi sesuai
[ ] Dokumen lengkap (Invoice + DO + Bukti Bayar)
[ ] Nama file sesuai standar
[ ] Folder penyimpanan benar
```
Checklist ini juga menjadi dasar verifikasi di SAKHA Finance Operations.

### A4. Aturan "rename segera setelah unduh/scan"
Jangan menunda rename — file default cepat menumpuk dan sulit dibedakan.

---

## B. SYSTEM IMPROVEMENT (PROPOSED)

### B1. Document & Transaction Monitoring System (SAKHA Finance Operations)
Sebuah pusat data operasional dengan konsep:

> **Satu transaksi = satu konteks.**

Satu transaksi menghubungkan: customer → invoice → payment → delivery → dokumen →
verifikasi → riwayat aktivitas.

### B2. Status yang jelas
- Transaksi: DRAFT → PROCESSING → AWAITING_PAYMENT → PAID → PREPARING_DELIVERY →
  IN_DELIVERY → DELIVERED → COMPLETED, plus NEEDS_REVIEW & CANCELLED.
- Dokumen: UPLOADED → UNDER_REVIEW → VERIFIED / REJECTED / ARCHIVED.

### B3. Verification engine deterministik
Memeriksa otomatis: dokumen wajib, konsistensi customer, kecocokan nominal invoice,
saldo payment, tracking pengiriman, konsistensi tanggal, duplikat dokumen, keabsahan file.
Hasil **PASS / WARNING / FAILED** dengan **alasan** yang bisa dibaca manusia.

### B4. Attention queue
Daftar "apa yang perlu ditindak sekarang" (dokumen hilang, invoice jatuh tempo,
verifikasi gagal, pengiriman terlambat, dokumen ditolak, kelebihan bayar) dengan
tingkat keparahan **HIGH / MEDIUM / LOW** yang **diturunkan dari kondisi nyata**.

### B5. Activity log / audit
Setiap aksi penting tercatat: siapa, apa, kapan, dan sebelum/sesudah nilai tertentu.

### B6. Notifikasi
Pemberitahuan operasional yang mengarahkan langsung ke entitas terkait.

---

## C. Dampak yang Diharapkan (jujur, tanpa angka karangan)

Jika usulan ini diterapkan, yang **diharapkan** membaik:
- Pencarian dokumen lebih cepat (satu sumber + struktur konsisten).
- Pencocokan lebih sedikit manual (verifikasi otomatis untuk aturan pasti).
- Kesalahan salah tulis lebih mudah dicegah (validasi + checklist).
- Status transaksi terlihat sekilas (dashboard attention queue).
- Riwayat bisa direkonstruksi (activity log).

> Saya **tidak** mengklaim penghematan waktu/biaya dalam angka tertentu karena
> saya tidak pernah mengukurnya selama PKL.

---

## D. Urutan Penerapan yang Disarankan

1. **Quick wins dulu** (A1–A4) — nol biaya, bisa langsung, tidak mengganggu kerja.
2. **B1–B3** (sistem inti + verifikasi) — fondasi.
3. **B4–B6** (attention queue, audit, notifikasi) — nilai tambah.
