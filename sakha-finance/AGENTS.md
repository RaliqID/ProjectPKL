# SAKHA Finance Operations — Panduan Kontribusi

> Prototype **Sistem Informasi Pengelolaan Data dan Dokumen Finance**, dikembangkan dari
> kegiatan PKL di PT. Sakha Internasional. **Bukan** sistem produksi resmi perusahaan dan
> **tidak memuat data perusahaan**. Seluruh data bersifat fiktif.

## Ringkas

- **Backend:** Laravel 13 (`app/`, `routes/api.php`), PostgreSQL 17.
- **Frontend:** React 18 + TypeScript + Vite + Tailwind (`spa/`), di-build ke `public/`.
- **Auth:** session-based (Sanctum stateful), 3 peran: ADMIN / OPERATOR / REVIEWER.

## Menjalankan

```powershell
.\run.cmd            # klik dua kali, atau:
.\dev.ps1 up         # PostgreSQL + Laravel API (port dari .devport)
.\start-all.ps1      # + queue worker + Vite dev server
php artisan test     # 51 test
```

Reset data contoh:

```powershell
php artisan migrate:fresh --seed
php artisan sakha:regenerate-documents
```

## Aturan penting

1. **Bahasa UI:** seluruh teks yang dilihat pengguna memakai **Bahasa Indonesia**.
   Nilai enum (mis. `NEEDS_REVIEW`, `PAID`) tetap bahasa Inggris sebagai identifier stabil —
   hanya `label()` dan teks UI yang diterjemahkan.
2. **Satu sumber label:** label status/tipe dokumen didefinisikan di `app/Enums/*.php`
   (backend) dan `spa/src/lib/status.ts` (frontend). Ubah label di sana, jangan di komponen.
3. **Verifikasi deterministik:** mesin verifikasi (`app/Services/VerificationService.php`)
   dan pemeriksaan ketelitian (`app/Services/AccuracyService.php`) memakai aturan tetap.
   **Jangan** menambahkan AI/LLM untuk fitur ini.
4. **Jangan dulu menambah scope di luar Finance** (HR, payroll, CRM, akuntansi penuh, dsb.).
5. **Migrasi baru bersifat aditif** — jangan mengubah migrasi lama yang sudah jalan.
6. **Warna aksen** (merah Sakha) sengaja dibedakan dari warna error di `spa/tailwind.config.js`.
   Ubah keduanya bersama-sama atau tidak sama sekali.
7. **Build SPA** memakai plugin yang membersihkan berkas bundle lama di `public/assets`;
   jangan menonaktifkannya.
8. **Dark mode** memakai strategi token: warna `ink`/`accent`/status di `index.css` `.dark`
   menimpa CSS variable. Tambah warna baru lewat token, jangan `dark:` per elemen.

## Email & laporan terjadwal

- Konfigurasi SMTP ada di `.env` (`MAIL_MAILER=smtp`). Untuk demo dipakai **Mailtrap sandbox**;
  ganti ke SMTP produksi bila perlu.
- Uji kirim manual: `php artisan sakha:send-report monthly --sync` (tanpa `--sync` → masuk antrean).
- Scheduler terdaftar di `bootstrap/app.php` → `withSchedule()` (harian 07:00, mingguan Senin,
  bulanan tgl 1). Worker wajib jalan (`.\start-all.ps1` sudah menjalankannya).

## Laporan PDF

- Semua laporan PDF dibuat `ReportController::pdf()` dari satu template
  `resources/views/reports/table.blade.php` (logo base64, nomor halaman, bar chart CSS).
- dompdf **tidak** merender SVG/canvas — grafik dibuat dari div + lebar persen.
- Orientasi: `landscape` untuk tabel lebar (Arsip, Pengadaan, Transaksi).


## Struktur singkat

```
app/Enums/          label status & tipe dokumen (Bahasa Indonesia)
app/Services/       VerificationService, AccuracyService, PaymentMatchService, ...
app/Http/Controllers/Api/   endpoint API
spa/src/pages/      halaman per modul
spa/src/components/ui/  komponen UI bersama (DataTable, Modal, Form, Charts, ...)
spa/src/lib/status.ts   peta label status (frontend)
```

## Dokumentasi PKL

Lihat `../docs/` untuk jobdesk, workflow, analisis masalah, usulan, dan audit kejujuran
(label ACTUAL / OBSERVATION / PROPOSED).
