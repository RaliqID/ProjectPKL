import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { usePayments, usePaymentAction } from '@/lib/hooks'
import { ReadOnlyBanner } from '@/components/RoleBadge'
import { formatDate, formatIDR } from '@/lib/format'
import { PAYMENT_METHODS, PAYMENT_STATUS, metaFor } from '@/lib/status'
import { useToast } from '@/lib/toast'
import { ApiError } from '@/lib/api'
import type { Payment } from '@/types/api'

export function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const action = usePaymentAction()
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null)

  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    method: params.get('method') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 15,
  }
  const { data, isLoading, error, refetch } = usePayments(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const act = async (id: number, act: 'confirm' | 'reject', reason?: string) => {
    try {
      await action.mutateAsync({ id, action: act, reason })
      toast.success(`Payment ${act === 'confirm' ? 'confirmed' : 'rejected'}`)
      setRejectTarget(null)
    } catch (err) {
      toast.error('Could not update payment', err instanceof ApiError ? err.message : undefined)
    }
  }

  const columns: Column<Payment>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (p) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{p.payment_reference ?? `PAY-${p.id}`}</p>
          <p className="text-2xs text-ink-400">{formatDate(p.payment_date)}</p>
        </div>
      ),
    },
    {
      key: 'transaction',
      header: 'Transaction',
      render: (p) => <span className="font-mono text-2xs text-ink-500">{p.transaction?.transaction_code ?? '—'}</span>,
    },
    { key: 'customer', header: 'Customer', render: (p) => <span className="text-xs text-ink-600">{p.transaction?.customer?.name ?? '—'}</span> },
    { key: 'method', header: 'Method', render: (p) => <span className="text-xs text-ink-600">{p.method_label}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="font-medium tabular-nums text-ink-800">{formatIDR(p.amount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const meta = metaFor(PAYMENT_STATUS, p.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) =>
        p.status === 'PENDING' ? (
          /*
            `role="presentation"` with a click handler is a contradiction: the
            handler existed only to stop a row click from firing when a button
            inside the cell was pressed. That is a layout concern, not an
            interaction, and expressing it as an interactive element makes the
            cell reachable by a screen reader and unreachable by a keyboard.
            The row-click suppression now lives on the cell wrapper below, where
            the semantics are honest.
          */
          <div className="flex justify-end gap-1.5" data-row-click-stop>
            <Button variant="secondary" className="px-2 py-1 text-2xs" onClick={() => act(p.id, 'confirm')}>
              Confirm
            </Button>
            <Button variant="danger" className="px-2 py-1 text-2xs" onClick={() => setRejectTarget(p)}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-2xs text-ink-300" aria-hidden>
            &mdash;
          </span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="Payments" description="All recorded payments across transactions, including partial payments." />
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Search reference, transaction…" className="w-full sm:w-64" />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => update('status', v)} placeholder="All statuses" options={Object.entries(PAYMENT_STATUS).map(([value, m]) => ({ value, label: m.label }))} />
        <FilterSelect label="Method" value={filters.method} onChange={(v) => update('method', v)} placeholder="All methods" options={PAYMENT_METHODS} />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <ReadOnlyBanner className="mb-4" />
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load payments.' : null}
            onRetry={() => refetch()}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/transactions/${p.transaction_id}`)}
            emptyTitle="No payments recorded"
            emptyDescription="Payments recorded against transactions will appear here."
            pagination={
              data?.meta
                ? { page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total, onPageChange: (p) => update('page', String(p)) }
                : undefined
            }
          />
        </div>
      </div>
      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject payment"
        message="Reject this payment? It will no longer count toward the settled balance."
        confirmLabel="Reject"
        danger
        loading={action.isPending}
        onConfirm={() => rejectTarget && act(rejectTarget.id, 'reject')}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
