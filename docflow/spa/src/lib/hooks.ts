import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toQuery } from '@/lib/api'
import type {
  ActivityLog,
  Customer,
  Delivery,
  Document,
  Invoice,
  OverviewData,
  Paginated,
  Payment,
  Transaction,
  TransactionDetail,
  VerificationRun,
} from '@/types/api'

// ---- Queries ----

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get<{ data: OverviewData }>('/api/overview').then((r) => r.data),
    // Near-realtime: the overview is the "what needs attention" surface, so it
    // polls while the tab is visible.
    refetchInterval: 15000,
  })
}

export function useTransactions(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.get<Paginated<Transaction>>(`/api/transactions${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useTransaction(id: number | string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.get<{ data: TransactionDetail }>(`/api/transactions/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCustomers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => api.get<Paginated<Customer>>(`/api/customers${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useCustomer(id: number | string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () =>
      api
        .get<{ data: { customer: Customer; outstanding_amount: string; recent_transactions: Transaction[] } }>(
          `/api/customers/${id}`,
        )
        .then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useDocuments(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api.get<Paginated<Document>>(`/api/documents${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useDocument(id: number | string | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get<{ data: Document }>(`/api/documents/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function usePayments(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => api.get<Paginated<Payment>>(`/api/payments${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useDeliveries(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['deliveries', filters],
    queryFn: () => api.get<Paginated<Delivery>>(`/api/deliveries${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useVerificationQueue(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['verification-queue', filters],
    queryFn: () =>
      api.get<{ data: QueueRow[]; meta: { current_page: number; last_page: number; total: number; per_page: number } }>(
        `/api/verification/queue${toQuery(filters)}`,
      ),
    placeholderData: (prev) => prev,
    refetchInterval: 20000,
  })
}

export interface QueueRow {
  transaction_id: number
  transaction_code: string
  customer: string | null
  status: string
  verification_status: string | null
  failed_count: number
  warning_count: number
  score: number | null
}

export function useActivity(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['activity', filters],
    queryFn: () => api.get<Paginated<ActivityLog>>(`/api/activity${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export function useReports(range: { date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ['reports', range],
    queryFn: () => api.get<{ data: ReportData }>(`/api/reports${toQuery(range)}`).then((r) => r.data),
  })
}

export interface ReportData {
  range: { from: string; to: string }
  transactions: { count: number; total_amount: string; completed: number; needs_review: number }
  payments: { count: number; confirmed_amount: string; pending_amount: string; rejected_count: number }
  deliveries: { count: number; delivered: number; in_transit: number; failed: number; delayed: number }
  documents: { count: number; verified: number; pending: number; rejected: number; by_type: Record<string, number> }
  verifications: { count: number; passed: number; warnings: number; failed: number; average_score: number }
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: SettingsData }>('/api/settings').then((r) => r.data),
  })
}

export interface SettingsData {
  required_documents: {
    id: number
    document_type: string
    document_type_label: string
    is_required: boolean
    is_active: boolean
    description: string | null
  }[]
  available_document_types: { value: string; label: string }[]
  system: {
    app_name: string
    timezone: string
    max_upload_mb: number
    allowed_file_types: string[]
    session_lifetime: number
  }
  roles: { value: string; label: string; description: string }[]
}

export function useUsers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      api.get<{ data: UserRow[]; meta: { total: number } }>(`/api/users${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  })
}

export interface UserRow {
  id: number
  name: string
  email: string
  role: string
  role_label: string
  is_active: boolean
  created_at: string
}

// ---- Mutations ----

export function useInvalidate() {
  const qc = useQueryClient()
  return {
    all: () => qc.invalidateQueries(),
    overview: () => qc.invalidateQueries({ queryKey: ['overview'] }),
    transactions: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    transaction: (id: number | string) => qc.invalidateQueries({ queryKey: ['transaction', String(id)] }),
    documents: () => qc.invalidateQueries({ queryKey: ['documents'] }),
    payments: () => qc.invalidateQueries({ queryKey: ['payments'] }),
    deliveries: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
    verification: () => qc.invalidateQueries({ queryKey: ['verification-queue'] }),
    activity: () => qc.invalidateQueries({ queryKey: ['activity'] }),
  }
}

export function useCreateTransaction() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<{ data: TransactionDetail }>('/api/transactions', body),
    onSuccess: () => {
      inv.transactions()
      inv.overview()
    },
  })
}

export function useChangeStatus() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reason?: string; override?: boolean }) =>
      api.post<{ data: TransactionDetail }>(`/api/transactions/${id}/status`, body),
    onSuccess: (_data, vars) => {
      inv.transaction(vars.id)
      inv.transactions()
      inv.overview()
      inv.activity()
    },
  })
}

export function useCompleteTransaction() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => api.post<{ data: TransactionDetail }>(`/api/transactions/${id}/complete`),
    onSuccess: (_data, id) => {
      inv.transaction(id)
      inv.transactions()
      inv.overview()
      inv.activity()
    },
  })
}

export function useCreateInvoice() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ transactionId, ...body }: { transactionId: number } & Record<string, unknown>) =>
      api.post<{ data: Invoice }>(`/api/transactions/${transactionId}/invoices`, body),
    onSuccess: (_d, v) => {
      inv.transaction(v.transactionId)
      inv.overview()
    },
  })
}

export function useCreatePayment() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ transactionId, ...body }: { transactionId: number } & Record<string, unknown>) =>
      api.post<{ data: Payment }>(`/api/transactions/${transactionId}/payments`, body),
    onSuccess: (_d, v) => {
      inv.transaction(v.transactionId)
      inv.payments()
      inv.transactions()
      inv.overview()
      inv.activity()
    },
  })
}

export function usePaymentAction() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'confirm' | 'reject'; reason?: string }) =>
      api.post(`/api/payments/${id}/${action}`, reason ? { reason } : {}),
    onSuccess: () => {
      inv.payments()
      inv.transactions()
      inv.overview()
      inv.verification()
    },
  })
}

export function useCreateDelivery() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ transactionId, ...body }: { transactionId: number } & Record<string, unknown>) =>
      api.post<{ data: Delivery }>(`/api/transactions/${transactionId}/deliveries`, body),
    onSuccess: (_d, v) => {
      inv.transaction(v.transactionId)
      inv.deliveries()
      inv.overview()
      inv.activity()
    },
  })
}

export function useDeliveryStatus() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.post(`/api/deliveries/${id}/status`, { status }),
    onSuccess: () => {
      inv.deliveries()
      inv.overview()
      inv.verification()
    },
  })
}

export function useUploadDocument() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ transactionId, formData }: { transactionId: number; formData: FormData }) =>
      api.post<{ data: Document }>(`/api/transactions/${transactionId}/documents`, formData),
    onSuccess: (_d, v) => {
      inv.transaction(v.transactionId)
      inv.documents()
      inv.overview()
      inv.activity()
    },
  })
}

export function useDocumentAction() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'verify' | 'reject' | 'archive'; reason?: string }) =>
      api.post(`/api/documents/${id}/${action}`, reason ? { reason } : {}),
    onSuccess: () => {
      inv.documents()
      inv.overview()
      inv.verification()
    },
  })
}

export function useRunVerification() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (transactionId: number) =>
      api.post<{ data: VerificationRun }>(`/api/transactions/${transactionId}/verification/run`),
    onSuccess: (_d, id) => {
      inv.transaction(id)
      inv.verification()
      inv.overview()
      inv.activity()
      inv.transactions()
    },
  })
}

export function useCreateCustomer() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<{ data: Customer }>('/api/customers', body),
    onSuccess: () => inv.all(),
  })
}

export function useUpdateCustomer() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      api.put<{ data: Customer }>(`/api/customers/${id}`, body),
    onSuccess: () => inv.all(),
  })
}

export function useUpdateRequiredDocuments() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (body: { rules: { document_type: string; is_required: boolean; is_active: boolean }[] }) =>
      api.put('/api/settings/required-documents', body),
    onSuccess: () => {
      inv.all()
    },
  })
}

export function useCreateUser() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/users', body),
    onSuccess: () => inv.all(),
  })
}

export function useUpdateUser() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => api.put(`/api/users/${id}`, body),
    onSuccess: () => inv.all(),
  })
}
