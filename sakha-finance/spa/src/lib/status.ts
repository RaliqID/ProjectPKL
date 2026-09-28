import type { Tone } from '@/types/api'

/**
 * Centralised status configuration. Every status string used in the UI maps to a
 * label + visual tone here, so status styling never drifts between screens.
 *
 * Labels are Indonesian; the keys are stable machine values and must match the
 * backend enums exactly.
 */

export interface StatusMeta {
  label: string
  tone: Tone
  description?: string
}

export const TRANSACTION_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Draf', tone: 'neutral', description: 'Dibuat, belum diproses.' },
  PROCESSING: { label: 'Diproses', tone: 'info', description: 'Sedang disiapkan.' },
  AWAITING_PAYMENT: { label: 'Menunggu Pembayaran', tone: 'warning', description: 'Pembayaran belum diselesaikan.' },
  PAID: { label: 'Dibayar', tone: 'success', description: 'Sudah dibayar penuh.' },
  PREPARING_DELIVERY: { label: 'Siap Kirim', tone: 'info', description: 'Pengiriman sedang disiapkan.' },
  IN_DELIVERY: { label: 'Dalam Pengiriman', tone: 'info', description: 'Sedang di kurir.' },
  DELIVERED: { label: 'Terkirim', tone: 'success', description: 'Diterima pelanggan.' },
  COMPLETED: { label: 'Selesai', tone: 'success', description: 'Alur kerja selesai.' },
  NEEDS_REVIEW: { label: 'Perlu Diperiksa', tone: 'danger', description: 'Ada temuan verifikasi yang perlu ditindaklanjuti.' },
  CANCELLED: { label: 'Dibatalkan', tone: 'muted', description: 'Dibatalkan.' },
}

export const INVOICE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Draf', tone: 'neutral' },
  ISSUED: { label: 'Diterbitkan', tone: 'info' },
  PARTIALLY_PAID: { label: 'Sebagian Dibayar', tone: 'warning' },
  PAID: { label: 'Lunas', tone: 'success' },
  OVERDUE: { label: 'Jatuh Tempo', tone: 'danger' },
  CANCELLED: { label: 'Dibatalkan', tone: 'muted' },
}

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'Menunggu', tone: 'warning' },
  CONFIRMED: { label: 'Terkonfirmasi', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
}

export const DELIVERY_STATUS: Record<string, StatusMeta> = {
  PREPARING: { label: 'Disiapkan', tone: 'neutral' },
  SHIPPED: { label: 'Dikirim', tone: 'info' },
  IN_TRANSIT: { label: 'Dalam Perjalanan', tone: 'info' },
  DELIVERED: { label: 'Terkirim', tone: 'success' },
  FAILED: { label: 'Gagal', tone: 'danger' },
  RETURNED: { label: 'Dikembalikan', tone: 'danger' },
}

export const DOCUMENT_STATUS: Record<string, StatusMeta> = {
  UPLOADED: { label: 'Diunggah', tone: 'neutral' },
  UNDER_REVIEW: { label: 'Sedang Ditinjau', tone: 'warning' },
  VERIFIED: { label: 'Terverifikasi', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
  ARCHIVED: { label: 'Diarsipkan', tone: 'muted' },
}

/** Verification / matching outcome. Mirrors the backend VerificationStatus enum. */
export const VERIFICATION_STATUS: Record<string, StatusMeta> = {
  PASS: { label: 'Sesuai', tone: 'success' },
  WARNING: { label: 'Perlu Diperiksa', tone: 'warning' },
  FAILED: { label: 'Tidak Sesuai', tone: 'danger' },
}

export const SEVERITY_META: Record<string, StatusMeta> = {
  LOW: { label: 'Rendah', tone: 'neutral' },
  MEDIUM: { label: 'Sedang', tone: 'warning' },
  HIGH: { label: 'Tinggi', tone: 'danger' },
}

/** Document type labels (mirrors the backend DocumentType enum). */
export const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'EFAKTUR', label: 'E-Faktur' },
  { value: 'PURCHASE_INVOICE', label: 'Purchase Invoice' },
  { value: 'DELIVERY_ORDER', label: 'Delivery Order' },
  { value: 'SURAT_JALAN', label: 'Surat Jalan' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'RESI', label: 'Resi' },
  { value: 'TANDA_TERIMA', label: 'Tanda Terima' },
  { value: 'PAYMENT_PROOF', label: 'Bukti Pembayaran' },
  { value: 'TAX_INVOICE', label: 'Faktur Pajak' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'SALES_ORDER', label: 'Sales Order' },
  { value: 'JOURNAL', label: 'Jurnal' },
  { value: 'BA', label: 'Berita Acara' },
  { value: 'OTHER', label: 'Dokumen Lainnya' },
]

export const COURIERS = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'Sakha Group', 'Lainnya']

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
  { value: 'CASH', label: 'Tunai' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'OTHER', label: 'Lainnya' },
]

export function metaFor(map: Record<string, StatusMeta>, status: string | undefined | null): StatusMeta {
  if (!status) return { label: '—', tone: 'neutral' }
  return map[status] ?? { label: status, tone: 'neutral' }
}

/** Role metadata — one source of truth for how each role is presented. */
export const ROLES: Record<
  string,
  { label: string; tone: Tone; summary: string; capabilities: string[]; cannot: string[] }
> = {
  ADMIN: {
    label: 'Administrator',
    tone: 'info',
    summary: 'Akses penuh — mengelola pengguna dan pengaturan, serta dapat menyesuaikan alur kerja.',
    capabilities: [
      'Membuat & memperbarui transaksi, pembayaran, pengiriman',
      'Mengunggah, memverifikasi, dan menolak dokumen',
      'Menjalankan verifikasi dan menyesuaikan status',
      'Mengelola pengguna dan pengaturan sistem',
    ],
    cannot: [],
  },
  OPERATOR: {
    label: 'Operator',
    tone: 'neutral',
    summary: 'Menjalankan pekerjaan operasional harian — mencatat data dan dokumen.',
    capabilities: [
      'Membuat & memperbarui transaksi, pembayaran, pengiriman',
      'Mengunggah dokumen',
      'Menjalankan verifikasi',
    ],
    cannot: ['Memverifikasi atau menolak dokumen', 'Menyesuaikan status alur kerja', 'Mengelola pengguna atau pengaturan'],
  },
  REVIEWER: {
    label: 'Pemeriksa',
    tone: 'warning',
    summary: 'Meninjau dan menyetujui — sebagian besar hanya membaca, dengan hak meninjau dokumen.',
    capabilities: ['Meninjau hasil verifikasi', 'Memverifikasi atau menolak dokumen', 'Melihat seluruh riwayat'],
    cannot: ['Membuat atau mengubah transaksi', 'Mencatat pembayaran atau pengiriman', 'Mengunggah dokumen'],
  },
}

export function roleMeta(role: string | undefined | null) {
  if (!role) return ROLES.OPERATOR
  return ROLES[role] ?? ROLES.OPERATOR
}
