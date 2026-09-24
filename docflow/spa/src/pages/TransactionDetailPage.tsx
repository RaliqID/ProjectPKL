import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Info,
  Plus,
  RefreshCw,
  Truck,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { TextInput, Select, Textarea } from '@/components/ui/Form'
import { useTransaction, useChangeStatus, useCompleteTransaction, useCreateInvoice, useCreatePayment, useCreateDelivery, useDeliveryStatus, useRunVerification, useUploadDocument, useInvalidate } from '@/lib/hooks'
import { formatDate, formatDateTime, formatIDR } from '@/lib/format'
import { DELIVERY_STATUS, DOCUMENT_TYPES, INVOICE_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, COURIERS, metaFor, TRANSACTION_STATUS } from '@/lib/status'
import { ApiError } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { reportFailure } from '@/lib/report'
import { useAuth } from '@/lib/auth'
import { ActivityTimeline } from '@/features/transactions/ActivityTimeline'
import { VerificationPanel } from '@/features/transactions/VerificationPanel'
import { DocumentList } from '@/features/transactions/DocumentList'
import clsx from 'clsx'

type Tab = 'overview' | 'invoice' | 'payment' | 'delivery' | 'documents' | 'verification' | 'activity'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'payment', label: 'Payment' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'documents', label: 'Documents' },
  { id: 'verification', label: 'Verification' },
  { id: 'activity', label: 'Activity' },
]

export function TransactionDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const { permissions } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [statusOpen, setStatusOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data: trx, isLoading, error, refetch } = useTransaction(id)
  const complete = useCompleteTransaction()
  const runVerification = useRunVerification()

  if (isLoading) return <DetailSkeleton />
  if (error || !trx) {
    return (
      <div className="p-8">
        <div className="df-card">
          <ErrorState message="Could not load this transaction." onRetry={() => refetch()} />
        </div>
      </div>
    )
  }

  const statusMeta = metaFor(TRANSACTION_STATUS, trx.status)
  const canWrite = permissions?.can_write_transactions ?? false
  const canReview = permissions?.can_review_documents ?? false
  const completion = trx.workflow.can_complete

  const handleComplete = async () => {
    try {
      await complete.mutateAsync(trx.id)
      toast.success('Transaction completed', trx.transaction_code)
      setCompleteOpen(false)
    } catch (err) {
      toast.error('Cannot complete transaction', err instanceof ApiError ? err.message : undefined)
      setCompleteOpen(false)
    }
  }

  const handleVerify = async () => {
    try {
      const result = await runVerification.mutateAsync(trx.id)
      const status = result.data.overall_status
      if (status === 'PASS') toast.success('Verification passed', `Score ${result.data.score}`)
      else if (status === 'WARNING') toast.info('Verification completed with warnings', `Score ${result.data.score}`)
      else toast.error('Verification failed', `${result.data.failed_count} failed check(s)`)
      setTab('verification')
    } catch (error) {
      reportFailure('run verification', error, toast, 'Could not run verification')
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/transactions" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800">
            <ArrowLeft className="h-3.5 w-3.5" />
            All transactions
          </Link>
        }
        title={trx.transaction_code}
        description={trx.customer?.name ?? 'â€”'}
        actions={
          <>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            {canWrite || canReview ? (
              <Button icon={<RefreshCw className="h-4 w-4" />} onClick={handleVerify} loading={runVerification.isPending}>
                Run Verification
              </Button>
            ) : null}
            {canWrite ? (
              <>
                {trx.status !== 'COMPLETED' && trx.status !== 'CANCELLED' ? (
                  <Button icon={<FileText className="h-4 w-4" />} onClick={() => setStatusOpen(true)}>
                    Update Status
                  </Button>
                ) : null}
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
                  Add Document
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {/* Summary strip */}
      <div className="border-b border-ink-200 bg-white px-6 py-4 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm md:grid-cols-4">
          <Field label="Total" value={<span className="font-semibold tabular-nums">{formatIDR(trx.financial.total_amount)}</span>} />
          <Field
            label="Outstanding"
            value={
              <span className={clsx('tabular-nums', Number(trx.financial.outstanding_amount) > 0 ? 'text-warn-700' : 'text-ink-700')}>
                {formatIDR(trx.financial.outstanding_amount)}
              </span>
            }
          />
          <Field label="Transaction date" value={formatDate(trx.transaction_date)} />
          <Field label="Purchase order" value={trx.purchase_order_number ?? 'â€”'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Transaction sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                'whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border-accent-600 text-accent-700'
                  : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
              )}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'documents' ? (
                <span className="ml-1.5 rounded bg-ink-100 px-1 text-2xs text-ink-500">{trx.documents.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6 lg:p-8">
        {tab === 'overview' ? (
          <OverviewTab trx={trx} onComplete={() => setCompleteOpen(true)} completion={completion} canWrite={canWrite} onRunVerify={handleVerify} verifying={runVerification.isPending} />
        ) : null}

        {tab === 'invoice' ? (
          <InvoiceTab invoices={trx.invoices} canWrite={canWrite} onAdd={() => setInvoiceOpen(true)} />
        ) : null}

        {tab === 'payment' ? (
          <PaymentTab trx={trx} canWrite={canWrite} onAdd={() => setPaymentOpen(true)} />
        ) : null}

        {tab === 'delivery' ? (
          <DeliveryTab trx={trx} canWrite={canWrite} onAdd={() => setDeliveryOpen(true)} />
        ) : null}

        {tab === 'documents' ? (
          <DocumentList documents={trx.documents} canWrite={canWrite} canReview={permissions?.can_review_documents ?? false} onAdded={() => setUploadOpen(true)} />
        ) : null}

        {tab === 'verification' ? (
          <VerificationPanel verification={trx.verification} canRun={canWrite || (permissions?.can_review_documents ?? false)} onRun={handleVerify} running={runVerification.isPending} transactionId={trx.id} />
        ) : null}

        {tab === 'activity' ? <ActivityTimeline logs={trx.timeline} /> : null}
      </div>

      {/* Modals */}
      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} trx={trx} isAdmin={permissions?.can_override_workflow ?? false} />
      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} transactionId={trx.id} />
      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} trx={trx} />
      <DeliveryModal open={deliveryOpen} onClose={() => setDeliveryOpen(false)} transactionId={trx.id} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} transactionId={trx.id} />

      <ConfirmDialog
        open={completeOpen}
        title="Complete transaction"
        message={`Mark ${trx.transaction_code} as COMPLETED? This requires a settled payment, a delivered order, and all required documents.`}
        confirmLabel="Complete"
        loading={complete.isPending}
        onConfirm={handleComplete}
        onCancel={() => setCompleteOpen(false)}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-800">{value}</dd>
    </div>
  )
}

function OverviewTab({
  trx,
  onComplete,
  completion,
  canWrite,
  onRunVerify,
  verifying,
}: {
  trx: ReturnType<typeof useTransaction>['data'] & object
  onComplete: () => void
  completion: { allowed: boolean; reasons: string[] }
  canWrite: boolean
  onRunVerify: () => void
  verifying: boolean
}) {
  const t = trx as NonNullable<ReturnType<typeof useTransaction>['data']>
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="df-card">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">Transaction Information</h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-sm">
            <Field label="Customer" value={t.customer?.name ?? 'â€”'} />
            <Field label="Customer code" value={t.customer?.customer_code ?? 'â€”'} />
            <Field label="Reference" value={t.reference_number ?? 'â€”'} />
            <Field label="Sales order" value={t.sales_order_number ?? 'â€”'} />
            <Field label="Created by" value={t.creator_name ?? 'â€”'} />
            <Field label="Created" value={formatDateTime(t.created_at)} />
            {t.notes ? (
              <div className="col-span-2">
                <dt className="text-2xs font-medium uppercase tracking-wide text-ink-400">Notes</dt>
                <dd className="mt-1 text-sm text-ink-700">{t.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">Financial Summary</h2>
          </div>
          <dl className="divide-y divide-ink-100">
            <MoneyRow label="Subtotal" value={t.financial.subtotal} />
            <MoneyRow label="Discount" value={t.financial.discount} />
            <MoneyRow label="Tax" value={t.financial.tax} />
            <MoneyRow label="Total" value={t.financial.total_amount} strong />
            <MoneyRow label="Paid" value={t.financial.paid_amount} tone="ok" />
            <MoneyRow label="Outstanding" value={t.financial.outstanding_amount} tone={Number(t.financial.outstanding_amount) > 0 ? 'warn' : 'ok'} />
          </dl>
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">Recent Timeline</h2>
          </div>
          <ActivityTimeline logs={t.timeline.slice(0, 6)} compact />
        </div>
      </div>

      <div className="space-y-6">
        <div className="df-card p-5">
          <h2 className="text-sm font-semibold text-ink-900">Workflow</h2>
          {trx.status === 'COMPLETED' ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-ok-50 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden />
              <p className="text-xs text-ok-700">This transaction is completed. All conditions were met.</p>
            </div>
          ) : trx.status === 'CANCELLED' ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-ink-100 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
              <p className="text-xs text-ink-600">This transaction was cancelled.</p>
            </div>
          ) : completion.allowed ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-ok-50 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden />
              <p className="text-xs text-ok-700">All completion conditions are met. This transaction can be completed.</p>
            </div>
          ) : (
            <div className="mt-3 rounded-md bg-warn-50 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" aria-hidden />
                <p className="text-xs font-medium text-warn-800">Cannot complete yet</p>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-8 text-xs text-warn-700">
                {completion.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {canWrite && trx.status !== 'COMPLETED' && trx.status !== 'CANCELLED' ? (
            <div className="mt-4 space-y-2">
              <Button variant="primary" className="w-full" onClick={onRunVerify} loading={verifying}>
                Run verification
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!completion.allowed}
                onClick={onComplete}
                title={completion.allowed ? undefined : 'Resolve the listed issues first'}
              >
                Mark as completed
              </Button>
            </div>
          ) : null}
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">Linked Records</h2>
          </div>
          <ul className="divide-y divide-ink-100 text-sm">
            <LinkedRow icon={<FileText className="h-4 w-4" />} label="Invoices" count={t.invoices.length} />
            <LinkedRow icon={<Wallet className="h-4 w-4" />} label="Payments" count={t.payments.length} />
            <LinkedRow icon={<Truck className="h-4 w-4" />} label="Deliveries" count={t.deliveries.length} />
            <LinkedRow icon={<BadgeCheck className="h-4 w-4" />} label="Documents" count={t.documents.length} />
          </ul>
        </div>
      </div>
    </div>
  )
}

function LinkedRow({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <li className="flex items-center justify-between px-5 py-2.5">
      <span className="flex items-center gap-2 text-xs text-ink-600">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-ink-800">{count}</span>
    </li>
  )
}

function MoneyRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd
        className={clsx(
          'tabular-nums',
          strong ? 'text-sm font-semibold text-ink-900' : 'text-sm text-ink-700',
          tone === 'ok' && 'text-ok-700',
          tone === 'warn' && 'text-warn-700',
        )}
      >
        {formatIDR(value)}
      </dd>
    </div>
  )
}

function InvoiceTab({ invoices, canWrite, onAdd }: { invoices: NonNullable<ReturnType<typeof useTransaction>['data']>['invoices']; canWrite: boolean; onAdd: () => void }) {
  return (
    <div className="df-card">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink-900">Invoices</h2>
        {canWrite && invoices.length === 0 ? (
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
            Add Invoice
          </Button>
        ) : null}
      </div>
      {invoices.length === 0 ? (
        <EmptyState title="No invoice yet" description="Add the invoice to enable amount and payment verification." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {invoices.map((inv) => {
            const meta = metaFor(INVOICE_STATUS, inv.status)
            return (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-mono text-sm font-medium text-ink-900">{inv.invoice_number}</p>
                  <p className="mt-0.5 text-2xs text-ink-400">
                    Issued {formatDate(inv.invoice_date)} Â· Due {formatDate(inv.due_date)}
                    {inv.is_overdue ? <span className="ml-1 font-medium text-bad-600">Â· {inv.days_overdue}d overdue</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink-900">{formatIDR(inv.total)}</p>
                    <p className="text-2xs text-ink-400">incl. tax {formatIDR(inv.tax_amount)}</p>
                  </div>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PaymentTab({ trx, canWrite, onAdd }: { trx: NonNullable<ReturnType<typeof useTransaction>['data']>; canWrite: boolean; onAdd: () => void }) {
  const payments = trx.payments
  const totalPaid = payments.filter((p) => p.status === 'CONFIRMED').reduce((sum, p) => sum + Number(p.amount), 0)
  const total = Number(trx.financial.total_amount)
  const pct = total > 0 ? Math.min((totalPaid / total) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div className="df-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Payment Progress</h2>
          {canWrite ? (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
              Record Payment
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xs uppercase tracking-wide text-ink-400">Total</p>
            <p className="mt-0.5 font-semibold tabular-nums text-ink-900">{formatIDR(trx.financial.total_amount)}</p>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wide text-ink-400">Paid</p>
            <p className="mt-0.5 font-semibold tabular-nums text-ok-700">{formatIDR(totalPaid)}</p>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wide text-ink-400">Remaining</p>
            <p className="mt-0.5 font-semibold tabular-nums text-warn-700">{formatIDR(trx.financial.outstanding_amount)}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-ok-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-2xs text-ink-400">{pct.toFixed(0)}% settled</p>
      </div>

      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Payments</h2>
        </div>
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded" description="Record a payment to move this transaction toward PAID." />
        ) : (
          <PaymentRows payments={payments} canWrite={canWrite} />
        )}
      </div>
    </div>
  )
}

function PaymentRows({ payments, canWrite }: { payments: NonNullable<ReturnType<typeof useTransaction>['data']>['payments']; canWrite: boolean }) {
  const { data: trx } = useTransaction(undefined)
  void trx
  const invalidate = useInvalidate()
  const toast = useToast()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const act = async (id: number, action: 'confirm' | 'reject') => {
    try {
      await fetch(`/api/payments/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] ?? ''),
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      invalidate.transaction(payments[0]?.transaction_id ?? 0)
      invalidate.overview()
      toast.success(`Payment ${action === 'confirm' ? 'confirmed' : 'rejected'}`)
    } catch (error) {
      reportFailure('update payment', error, toast, 'Could not update payment')
    }
  }

  return (
    <ul className="divide-y divide-ink-100">
      {payments.map((p) => {
        const meta = metaFor(PAYMENT_STATUS, p.status)
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-mono text-xs font-medium text-ink-800">{p.payment_reference ?? `PAY-${p.id}`}</p>
              <p className="mt-0.5 text-2xs text-ink-400">
                {formatDate(p.payment_date)} Â· {p.method_label}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums text-ink-900">{formatIDR(p.amount)}</span>
              <StatusBadge label={meta.label} tone={meta.tone} />
              {canWrite && p.status === 'PENDING' ? (
                <div className="flex gap-1.5">
                  <Button variant="secondary" className="px-2 py-1 text-2xs" onClick={() => act(p.id, 'confirm')}>
                    Confirm
                  </Button>
                  <Button variant="danger" className="px-2 py-1 text-2xs" onClick={() => setConfirmId(p.id)}>
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
      <ConfirmDialog
        open={confirmId !== null}
        title="Reject payment"
        message="Reject this payment? It will no longer count toward the settled balance."
        confirmLabel="Reject"
        danger
        onConfirm={() => {
          if (confirmId) act(confirmId, 'reject')
          setConfirmId(null)
        }}
        onCancel={() => setConfirmId(null)}
      />
    </ul>
  )
}

function DeliveryTab({ trx, canWrite, onAdd }: { trx: NonNullable<ReturnType<typeof useTransaction>['data']>; canWrite: boolean; onAdd: () => void }) {
  const deliveries = trx.deliveries
  const updateStatus = useDeliveryStatus()
  const toast = useToast()

  const advance = async (id: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status })
      toast.success('Delivery status updated')
    } catch (err) {
      toast.error('Could not update delivery', err instanceof ApiError ? err.message : undefined)
    }
  }

  return (
    <div className="space-y-6">
      <div className="df-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Deliveries</h2>
          {canWrite && deliveries.length === 0 ? (
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
              Create Delivery
            </Button>
          ) : null}
        </div>
        {deliveries.length === 0 ? (
          <EmptyState
            title="No delivery yet"
            description="Create a delivery once payment is settled to start tracking shipment."
            icon={<Truck className="h-5 w-5" />}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {deliveries.map((d) => {
              const meta = metaFor(DELIVERY_STATUS, d.status)
              const nextStatus: Record<string, string> = {
                PREPARING: 'SHIPPED',
                SHIPPED: 'IN_TRANSIT',
                IN_TRANSIT: 'DELIVERED',
              }
              return (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-medium text-ink-800">{d.delivery_number ?? `DO-${d.id}`}</p>
                      <p className="mt-0.5 text-2xs text-ink-400">
                        {d.courier} Â· {d.tracking_number ?? 'no tracking'}
                        {d.is_delayed ? <span className="ml-1 font-medium text-bad-600">Â· delayed</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge label={meta.label} tone={meta.tone} />
                      {canWrite && nextStatus[d.status] ? (
                        <Button variant="secondary" className="px-2 py-1 text-2xs" onClick={() => advance(d.id, nextStatus[d.status])}>
                          Mark {nextStatus[d.status].replace('_', ' ')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-4">
                    <Field label="Shipped" value={formatDate(d.shipping_date)} />
                    <Field label="ETA" value={formatDate(d.estimated_delivery_date)} />
                    <Field label="Delivered" value={formatDate(d.delivered_at)} />
                    <Field label="Recipient" value={d.recipient_name ?? 'â€”'} />
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---- Modals ----

function StatusModal({ open, onClose, trx, isAdmin }: { open: boolean; onClose: () => void; trx: NonNullable<ReturnType<typeof useTransaction>['data']>; isAdmin: boolean }) {
  const toast = useToast()
  const change = useChangeStatus()
  const [status, setStatus] = useState('')
  const [reason, setReason] = useState('')
  const [override, setOverride] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const submit = async () => {
    setErrors({})
    try {
      await change.mutateAsync({ id: trx.id, status, reason: reason || undefined, override })
      toast.success('Status updated', status)
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not update status', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Status"
      description={`Current status: ${trx.status_label}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!status} loading={change.isPending} onClick={submit}>
            Update Status
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="New status"
          required
          placeholder="Select a statusâ€¦"
          options={trx.allowed_transitions.map((t) => ({ value: t.value, label: t.label }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          error={errors.status}
          hint={trx.allowed_transitions.length === 0 ? 'No further transitions are allowed.' : undefined}
        />
        {isAdmin ? (
          <>
            <label className="flex items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600"
              />
              Override workflow transition (Administrator only)
            </label>
            {override ? (
              <Textarea label="Reason for override" required value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  )
}

function InvoiceModal({ open, onClose, transactionId }: { open: boolean; onClose: () => void; transactionId: number }) {
  const toast = useToast()
  const create = useCreateInvoice()
  const [form, setForm] = useState({ invoice_number: '', invoice_date: '', due_date: '', amount: '', tax_amount: '0' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setErrors({})
    try {
      await create.mutateAsync({
        transactionId,
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        amount: Number(form.amount || 0),
        tax_amount: Number(form.tax_amount || 0),
      })
      toast.success('Invoice added')
      onClose()
      setForm({ invoice_number: '', invoice_date: '', due_date: '', amount: '', tax_amount: '0' })
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors ?? {})
      toast.error('Could not add invoice', error instanceof ApiError ? error.message : undefined)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Invoice"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Save Invoice
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Invoice number" required value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} error={errors.invoice_number} placeholder="INV-â€¦" />
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Invoice date" type="date" value={form.invoice_date} onChange={(e) => set('invoice_date', e.target.value)} error={errors.invoice_date} />
          <TextInput label="Due date" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} error={errors.due_date} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Amount" type="number" min={0} required value={form.amount} onChange={(e) => set('amount', e.target.value)} error={errors.amount} />
          <TextInput label="Tax amount" type="number" min={0} value={form.tax_amount} onChange={(e) => set('tax_amount', e.target.value)} error={errors.tax_amount} />
        </div>
      </div>
    </Modal>
  )
}

function PaymentModal({ open, onClose, trx }: { open: boolean; onClose: () => void; trx: NonNullable<ReturnType<typeof useTransaction>['data']> }) {
  const toast = useToast()
  const create = useCreatePayment()
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'BANK_TRANSFER',
    payment_reference: '',
    status: 'CONFIRMED',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setErrors({})
    try {
      await create.mutateAsync({
        transactionId: trx.id,
        amount: Number(form.amount || 0),
        payment_date: form.payment_date,
        method: form.method,
        status: form.status,
        payment_reference: form.payment_reference || null,
        notes: form.notes || null,
      })
      toast.success('Payment recorded')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not record payment', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      description={`Outstanding balance: ${formatIDR(trx.financial.outstanding_amount)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Amount" type="number" min={0} required value={form.amount} onChange={(e) => set('amount', e.target.value)} error={errors.amount} />
          <TextInput label="Payment date" type="date" required value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} error={errors.payment_date} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Method" options={PAYMENT_METHODS} value={form.method} onChange={(e) => set('method', e.target.value)} error={errors.method} />
          <Select
            label="Status"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            error={errors.status}
          />
        </div>
        <TextInput label="Reference" value={form.payment_reference} onChange={(e) => set('payment_reference', e.target.value)} error={errors.payment_reference} placeholder="PAY-â€¦" />
        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

function DeliveryModal({ open, onClose, transactionId }: { open: boolean; onClose: () => void; transactionId: number }) {
  const toast = useToast()
  const create = useCreateDelivery()
  const [form, setForm] = useState({
    courier: 'JNE',
    tracking_number: '',
    shipping_date: new Date().toISOString().slice(0, 10),
    estimated_delivery_date: '',
    recipient_name: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setErrors({})
    try {
      await create.mutateAsync({
        transactionId,
        courier: form.courier,
        tracking_number: form.tracking_number || null,
        shipping_date: form.shipping_date || null,
        estimated_delivery_date: form.estimated_delivery_date || null,
        recipient_name: form.recipient_name || null,
        status: 'PREPARING',
      })
      toast.success('Delivery created')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not create delivery', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Delivery"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Create Delivery
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Courier" required options={COURIERS.map((c) => ({ value: c, label: c }))} value={form.courier} onChange={(e) => set('courier', e.target.value)} error={errors.courier} />
          <TextInput label="Tracking number" value={form.tracking_number} onChange={(e) => set('tracking_number', e.target.value)} error={errors.tracking_number} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Shipping date" type="date" value={form.shipping_date} onChange={(e) => set('shipping_date', e.target.value)} error={errors.shipping_date} />
          <TextInput label="Estimated delivery" type="date" value={form.estimated_delivery_date} onChange={(e) => set('estimated_delivery_date', e.target.value)} error={errors.estimated_delivery_date} />
        </div>
        <TextInput label="Recipient name" value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} error={errors.recipient_name} />
      </div>
    </Modal>
  )
}

function UploadModal({ open, onClose, transactionId }: { open: boolean; onClose: () => void; transactionId: number }) {
  const toast = useToast()
  const upload = useUploadDocument()
  const [documentType, setDocumentType] = useState('INVOICE')
  const [documentNumber, setDocumentNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const submit = async () => {
    if (!file) {
      setErrors({ file: ['Please choose a file.'] })
      return
    }
    setErrors({})
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    if (documentNumber) formData.append('document_number', documentNumber)

    try {
      await upload.mutateAsync({ transactionId, formData })
      toast.success('Document uploaded')
      onClose()
      setFile(null)
      setDocumentNumber('')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not upload document', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Document"
      description="PDF, JPG, PNG or WEBP up to 10 MB. Files are stored with a safe generated name."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={upload.isPending} onClick={submit}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Document type" required options={DOCUMENT_TYPES} value={documentType} onChange={(e) => setDocumentType(e.target.value)} error={errors.document_type} />
        <TextInput label="Document number" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} error={errors.document_number} placeholder="Optional" />
        <div>
          <label className="df-label" htmlFor="file-input">
            File <span className="text-bad-500">*</span>
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-ink-600 file:mr-3 file:rounded-md file:border file:border-ink-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-50"
          />
          {errors.file ? <p className="mt-1 text-xs text-bad-600">{errors.file[0]}</p> : null}
        </div>
      </div>
    </Modal>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid grid-cols-3 gap-6">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
