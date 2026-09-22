# 01 — PROJECT OVERVIEW

> **Honesty labels used throughout this documentation:**
> - **ACTUAL** — what I genuinely did during my PKL (internship).
> - **OBSERVATION** — patterns I noticed in the workflow.
> - **PROPOSED** — ideas/designs I created. Not used by the company.
>
> DOCFLOW is an **independent prototype** inspired by my internship workflow.
> It is **not** the company's real system and uses **no real company data**.

---

## Identitas Project

| Item | Keterangan |
|---|---|
| Judul | **DOCFLOW — Document & Transaction Operations Management System** |
| Tagline | Organize. Verify. Track. |
| Jenis | Full-stack prototype / usulan sistem (bukan sistem perusahaan) |
| Terinspirasi dari | Pengalaman PKL pada pekerjaan operasional dokumen & transaksi |
| Periode PKL | ± 20 Januari – 29 Juni |
| Peserta | Siswa SMK jurusan Rekayasa Perangkat Lunak (RPL) |
| Stack | Laravel 13 + PostgreSQL 17 + React 18 + TypeScript + Vite + Tailwind CSS |
| Status | Prototype jalan penuh; **belum dipakai perusahaan** (PROPOSED) |

---

## Latar Belakang (ACTUAL)

Selama PKL, saya tidak membuat aplikasi dari awal. Pekerjaan saya sehari-hari adalah
membantu proses operasional: invoice, resi, dokumen fisik/digital, marketplace,
pengadaan, payment, pengiriman, scanning, filling, dashboard, Accurate, Excel,
WhatsApp, dan arsip.

Dari pekerjaan itu muncul satu pola yang berulang (OBSERVATION):

> **Data dan dokumen datang dari banyak sumber → harus dicek → dicocokkan → diinput →
> di-scan/rename → disimpan → di-filling → dimonitor → diverifikasi.**

Urutan inilah yang menjadi *design principle* DOCFLOW: **data harus mengalir melalui
sistem dalam satu alur yang bisa ditelusuri.**

---

## Masalah (OBSERVATION)

1. **Data tersebar** di banyak tempat (marketplace, Accurate, Excel, dashboard, WhatsApp, folder).
2. **Dokumen fisik dan digital** harus dikelola bersamaan.
3. Banyak proses butuh **pencocokan manual** satu per satu.
4. File perlu **dinamai ulang & disimpan** dengan aturan konsisten.
5. Dokumen harus **mudah ditemukan kembali** (per tahun/bulan/customer/jenis).
6. Banyak langkah masih **bergantung pengecekan manual**.
7. Info **pengiriman & payment** perlu diperbarui berkala.
8. Kesalahan kecil (nama customer, no. invoice, resi, tanggal) bisa membuat proses **harus dicek ulang**.

> Ini catatan pengamatan saya, **bukan** klaim kerugian perusahaan. Saya tidak menyampaikan
> angka kerugian dan tidak akan mengarangnya.

---

## Tujuan

1. **Mendokumentasikan** pekerjaan PKL secara jujur (jobdesk, workflow, tools, output, kendala).
2. **Memetakan** pola workflow yang berulang.
3. **Mengusulkan perbaikan** ringan (standardisasi nama file, struktur folder, checklist).
4. **Merancang & membangun prototype** sistem monitoring dokumen & transaksi sebagai gambaran usulan.
5. **Menghasilkan materi sidang** yang bisa saya pertanggungjawabkan sendiri.

---

## Scope (yang dikerjakan)

- Analisis 29 pekerjaan PKL (A–AC).
- Rancangan workflow end-to-end.
- Prototype full-stack: transaksi, invoice, payment (termasuk partial), delivery, dokumen
  (upload/preview/versi), verification engine, workflow engine, activity log, notifikasi,
  attention queue, search, filter, pagination, auth + role (ADMIN/OPERATOR/REVIEWER).
- Dokumentasi + materi presentasi + Q&A sidang.

## Non-Scope (yang TIDAK diklaim)

- ❌ Bukan sistem perusahaan; tidak dipakai perusahaan.
- ❌ Tidak memakai data perusahaan asli. Semua nama customer/invoice/resi fiktif.
- ❌ Tidak ada AI/OCR/automation cerdas — verification engine **deterministik** (aturan jelas).
- ❌ Tidak mengarang jumlah transaksi/customer/dampak finansial milik perusahaan.

---

## Output Akhir

| # | Output | Lokasi |
|---|---|---|
| 1 | Project overview | `01_PROJECT_OVERVIEW.md` |
| 2 | Analisis jobdesk (audit) | `02_JOBDESK_ANALYSIS.md` |
| 3 | Workflow lengkap | `03_WORKFLOW.md` |
| 4 | Analisis masalah | `04_PROBLEM_ANALYSIS.md` |
| 5 | Rencana improvement | `05_IMPROVEMENT.md` |
| 6 | Usulan sistem | `06_SYSTEM_PROPOSAL.md` |
| 7 | Dokumentasi prototype | `07_PROTOTYPE.md` |
| 8 | Struktur presentasi + speaker notes | `08_PRESENTATION.md` |
| 9 | Q&A sidang | `09_QA_SIDANG.md` |
| 10 | Audit kejujuran | `11_FINAL_REVIEW.md` |
| 11 | Aplikasi jalan | `../docflow/` |
