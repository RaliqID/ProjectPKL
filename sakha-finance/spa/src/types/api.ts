// Shared API types mirroring the Laravel resources.

export type UserRole = 'ADMIN' | 'OPERATOR' | 'REVIEWER'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
  role_label: string
  role_description?: string
  is_active: boolean
  theme_preference?: 'light' | 'dark' | 'system' | null
  email_notifications?: boolean
  notification_types?: string[] | null
}

export interface Permissions {
  can_write_transactions: boolean
  can_manage_users: boolean
  can_manage_settings: boolean
  can_review_documents: boolean
  can_override_workflow: boolean
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface Customer {
  id: number
  customer_code: string
  name: string
  company_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  status: 'ACTIVE' | 'INACTIVE'
  notes: string | null
  transactions_count?: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  transaction_code: string
  customer?: Customer
  customer_id: number
  transaction_date: string
  status: string
  status_label: string
  status_tone: Tone
  reference_number: string | null
  purchase_order_number: string | null
  sales_order_number: string | null
  subtotal: string
  discount: string
  tax: string
  total_amount: string
  notes: string | null
  paid_amount?: string
  outstanding_amount?: string
  creator_name?: string
  documents_count?: number
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: number
  transaction_id: number
  transaction_code?: string | null
  customer_name?: string | null
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  amount: string
  tax_amount: string
  total: string
  status: string
  status_label: string
  document_id: number | null
  paid_amount?: string
  remaining_amount?: string
  days_until_due: number | null
  days_overdue: number
  is_overdue: boolean
  created_at: string
}

export interface Payment {
  id: number
  transaction_id: number
  invoice_id: number | null
  payment_reference: string | null
  payment_date: string
  amount: string
  method: string
  method_label: string
  status: string
  status_label: string
  notes: string | null
  transaction?: Transaction
  created_at: string
}

export interface Delivery {
  id: number
  transaction_id: number
  delivery_number: string | null
  delivery_order_number: string | null
  courier: string | null
  expedition: string | null
  tracking_number: string | null
  receipt_number: string | null
  handover_number: string | null
  handover_date: string | null
  shipping_date: string | null
  estimated_delivery_date: string | null
  delivered_at: string | null
  status: string
  status_label: string
  recipient_name: string | null
  notes: string | null
  is_delayed: boolean
  transaction?: Transaction
  created_at: string
}

export interface DocumentVersion {
  id: number
  version: number
  original_filename: string
  stored_filename: string
  mime_type: string
  file_size: number
  uploaded_by: number | null
  uploader_name?: string
  change_note: string | null
  created_at: string
}

export interface Document {
  id: number
  transaction_id: number | null
  document_type: string
  document_type_label: string
  original_filename: string
  stored_filename: string
  mime_type: string
  file_size: number
  file_size_label: string
  document_number: string | null
  transaction_code?: string | null
  uploaded_by: number | null
  uploader_name?: string
  status: string
  status_label: string
  current_version: number
  is_previewable: boolean
  verified_at: string | null
  uploaded_at: string
  versions?: DocumentVersion[]
  transaction?: Transaction
}

export interface VerificationCheck {
  id: number
  rule_key: string
  rule_label: string
  status: 'PASS' | 'WARNING' | 'FAILED'
  status_label: string
  message: string
  metadata: Record<string, unknown> | null
}

export interface VerificationRun {
  id: number
  transaction_id: number
  overall_status: 'PASS' | 'WARNING' | 'FAILED'
  score: number
  pass_count: number
  warning_count: number
  failed_count: number
  runner_name?: string
  checks?: VerificationCheck[]
  created_at: string
}

export interface ActivityLog {
  id: number
  user_id: number | null
  user_name: string
  entity_type: string
  entity_id: number | null
  action: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TransactionDetail extends Transaction {
  financial: {
    subtotal: string
    discount: string
    tax: string
    total_amount: string
    paid_amount: string
    outstanding_amount: string
  }
  invoices: Invoice[]
  payments: Payment[]
  deliveries: Delivery[]
  documents: Document[]
  verification: VerificationRun | null
  timeline: ActivityLog[]
  allowed_transitions: { value: string; label: string }[]
  workflow: { can_complete: { allowed: boolean; reasons: string[] } }
}

export interface AttentionItem {
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  type: string
  entity_type: string
  entity_id: number
  transaction_code: string
  message: string
  created_at: string | null
}

export interface OverviewData {
  metrics: {
    total_transactions: number
    transactions_this_month: number
    completed_transactions: number
    needs_review: number
    active_deliveries: number
    pending_documents: number
    verification_failures: number
    outstanding_payment_amount: string
    overdue_invoices: number
    overdue_invoices_amount: string
    delayed_deliveries: number
    // Finance-focused counters (Beranda)
    invoices_total: number
    invoices_unpaid: number
    payments_this_month: number
    payments_pending: number
    documents_archived: number
    documents_total: number
    deliveries_total: number
    deliveries_missing_receipt: number
    deliveries_missing_handover: number
    deliveries_delivered_unfiled: number
  }
  attention: AttentionItem[]
  recent_activity: ActivityLog[]
  status_breakdown: Record<string, number>
  document_status_breakdown: Record<string, number>
  trends: {
    transactions: number[]
    invoices: number[]
    payments: number[]
    documents: number[]
    expenses: number[]
    procurements: number[]
  }
}

export interface AppNotification {
  id: number
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  title: string
  message: string
  entity_type: string | null
  entity_id: number | null
  read_at: string | null
  is_unread: boolean
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    unread_count?: number
  }
  links?: Record<string, string | null>
}

export interface SearchResult {
  entity_type: string
  label: string
  match_type: string
  customer: string | null
  status: string
  transaction_id: number
}

export interface AnalyticsData {
  range: { from: string; to: string; months: number }
  months: string[]
  transactions: {
    total: number[]
    completed: number[]
    needs_review: number[]
    grand_total: number
    grand_completed: number
  }
  revenue: {
    paid: number[]
    invoiced: number[]
    total_paid: number
    total_invoiced: number
  }
  verification: {
    passed: number[]
    warning: number[]
    failed: number[]
    average_score: number[]
    total_runs: number
    overall_pass_rate: number
  }
  deliveries: {
    completed: number[]
    in_transit: number[]
    delayed: number[]
    total: number
    on_time_rate: number
  }
  documents: {
    uploaded: number[]
    verified: number[]
    total: number
  }
  invoices: {
    issued: number[]
    paid: number[]
    overdue: number[]
    value: number[]
    total: number
    total_value: number
    overdue_current: number
  }
  payments: {
    recorded: number[]
    confirmed: number[]
    pending: number[]
    value: number[]
    total: number
    total_confirmed: number
  }
  matching: {
    sesuai: number
    perlu_diperiksa: number
    tidak_sesuai: number
    total: number
    match_rate: number
    difference_total: number
  }
  archives: {
    filed: number[]
    total: number
    by_type: { value: string; label: string; total: number }[]
  }
  accuracy: {
    sesuai: number
    perlu_diperiksa: number
    tidak_sesuai: number
    total: number
    accuracy_rate: number
    check_totals: { sesuai: number; perlu_diperiksa: number; tidak_sesuai: number }
  }
  expenses: {
    count: number[]
    fuel_amount: number[]
    other_amount: number[]
    total: number
    total_amount: number
    approved: number
  }
  procurements: {
    count: number[]
    value: number[]
    total: number
    total_value: number
    by_status: Record<string, number>
  }
  status_breakdown: Record<string, number>
}
