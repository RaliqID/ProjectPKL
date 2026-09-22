import type { Tone } from '@/types/api'

/**
 * Centralised status configuration. Every status string used in the UI maps to a
 * label + visual tone here, so status styling never drifts between screens.
 */

export interface StatusMeta {
  label: string
  tone: Tone
  description?: string
}

export const TRANSACTION_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Draft', tone: 'neutral', description: 'Created, not yet processing.' },
  PROCESSING: { label: 'Processing', tone: 'info', description: 'Being prepared.' },
  AWAITING_PAYMENT: { label: 'Awaiting Payment', tone: 'warning', description: 'Payment not yet settled.' },
  PAID: { label: 'Paid', tone: 'success', description: 'Fully paid.' },
  PREPARING_DELIVERY: { label: 'Preparing Delivery', tone: 'info', description: 'Delivery being prepared.' },
  IN_DELIVERY: { label: 'In Delivery', tone: 'info', description: 'With courier.' },
  DELIVERED: { label: 'Delivered', tone: 'success', description: 'Received by customer.' },
  COMPLETED: { label: 'Completed', tone: 'success', description: 'Workflow finished.' },
  NEEDS_REVIEW: { label: 'Needs Review', tone: 'danger', description: 'A verification issue needs attention.' },
  CANCELLED: { label: 'Cancelled', tone: 'muted', description: 'Cancelled.' },
}

export const INVOICE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ISSUED: { label: 'Issued', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partially Paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
}

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
}

export const DELIVERY_STATUS: Record<string, StatusMeta> = {
  PREPARING: { label: 'Preparing', tone: 'neutral' },
  SHIPPED: { label: 'Shipped', tone: 'info' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'danger' },
}

export const DOCUMENT_STATUS: Record<string, StatusMeta> = {
  UPLOADED: { label: 'Uploaded', tone: 'neutral' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'warning' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  ARCHIVED: { label: 'Archived', tone: 'muted' },
}

export const VERIFICATION_STATUS: Record<string, StatusMeta> = {
  PASS: { label: 'Pass', tone: 'success' },
  WARNING: { label: 'Warning', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
}

export const SEVERITY_META: Record<string, StatusMeta> = {
  LOW: { label: 'Low', tone: 'neutral' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  HIGH: { label: 'High', tone: 'danger' },
}

/** Document type labels (mirrors the backend enum). */
export const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'DELIVERY_ORDER', label: 'Delivery Order' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'PAYMENT_PROOF', label: 'Payment Proof' },
  { value: 'TAX_INVOICE', label: 'Tax Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'SALES_ORDER', label: 'Sales Order' },
  { value: 'JOURNAL', label: 'Journal' },
  { value: 'BA', label: 'Berita Acara' },
  { value: 'OTHER', label: 'Other' },
]

export const COURIERS = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'Other']

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'OTHER', label: 'Other' },
]

export function metaFor(map: Record<string, StatusMeta>, status: string | undefined | null): StatusMeta {
  if (!status) return { label: '—', tone: 'neutral' }
  return map[status] ?? { label: status, tone: 'neutral' }
}
