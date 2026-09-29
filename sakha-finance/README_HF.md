---
title: SAKHA Finance Operations
emoji: 📄
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# SAKHA Finance Operations

**Sistem Informasi Pengelolaan Data dan Dokumen Finance** — prototype yang
dikembangkan berdasarkan kegiatan PKL di **PT. Sakha Internasional**.

> ⚠️ Ini **prototype** (bukan sistem produksi resmi perusahaan) dan memakai
> **data contoh (fiktif)**.

## Akun demo

| Email | Peran | Kata sandi |
|---|---|---|
| `admin@sakha.test` | Administrator | `password` |
| `operator@sakha.test` | Operator | `password` |
| `reviewer@sakha.test` | Pemeriksa | `password` |

## Modul

Beranda · Transaksi · Invoice · Pembayaran (Pencocokan) · Pengiriman · Dokumen ·
Arsip · Verifikasi · Pemeriksaan Ketelitian · Analitik · Pengeluaran · Pengadaan ·
Pelanggan · Aktivitas · Laporan · Pengaturan

## Teknologi

Laravel 13 (PHP 8.3) · SQLite · React 18 + TypeScript + Vite · Tailwind CSS · dompdf

## Catatan deploy

Versi yang berjalan di Space ini memakai **SQLite** (dibuat & di-*seed* otomatis
saat start) karena paket gratis Spaces tidak menyediakan PostgreSQL. Data akan
kembali ke kondisi awal setiap container di-restart — cukup untuk demo.

Dokumentasi lengkap & screenshot ada di repositori GitHub:
<https://github.com/RaliqID/ProjectPKL>

---

Dikembangkan oleh **Raliq Hidayat** · PT. Sakha Internasional — PKL.
