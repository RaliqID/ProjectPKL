import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { useTransactions } from '@/lib/hooks'
import { formatIDR, formatDate } from '@/lib/format'
import { metaFor, TRANSACTION_STATUS } from '@/lib/status'
import type { Transaction } from '@/types/api'
import { CreateTransactionModal } from '@/features/transactions/CreateTransactionModal'

export function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  const page = Number(params.get('page') ?? 1)
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    payment_status: params.get('payment_status') ?? '',
    delivery_status: params.get('delivery_status') ?? '',
    date_from: params.get('date_from') ?? '',
    date_to: params.get('date_to') ?? '',
    sort: params.get('sort') ?? 'created_at',
    direction: params.get('direction') ?? 'desc',
    page,
    per_page: 15,
  }

  const { data, isLoading, error, refetch } = useTransactions(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const columns: Column<Transaction>[] = [
    {
      key: 'code',
      header: 'Transaction',
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-900">{t.transaction_code}</p>
          <p className="text-2xs text-ink-400">{t.purchase_order_number ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (t) => (
        <div>
          <p className="max-w-[220px] truncate text-xs text-ink-700">{t.customer?.name ?? '—'}</p>
          <p className="text-2xs text-ink-400">{t.customer?.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'transaction_date',
      header: 'Date',
      sortable: true,
      render: (t) => <span className="text-xs text-ink-600">{formatDate(t.transaction_date)}</span>,
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (t) => <span className="font-medium tabular-nums text-ink-800">{formatIDR(t.total_amount)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (t) => {
        const outstanding = Number(t.outstanding_amount ?? 0)
        return (
          <span className={`tabular-nums ${outstanding > 0 ? 'text-warn-700' : 'text-ink-400'}`}>
            {outstanding > 0 ? formatIDR(t.outstanding_amount) : '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => {
        const meta = metaFor(TRANSACTION_STATUS, t.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every operational transaction and its lifecycle in one list."
        actions={
          <>
            <Button onClick={() => update('q', '')} variant="secondary" className="hidden sm:inline-flex">
              Reset
            </Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New Transaction
            </Button>
          </>
        }
      />

      <FilterBar>
        <SearchInput
          value={filters.q}
          onChange={(v) => update('q', v)}
          placeholder="Search code, PO, customer…"
          className="w-full sm:w-64"
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => update('status', v)}
          placeholder="All statuses"
          options={Object.entries(TRANSACTION_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
        />
        <FilterSelect
          label="Payment"
          value={filters.payment_status}
          onChange={(v) => update('payment_status', v)}
          placeholder="All payments"
          options={[
            { value: 'PAID', label: 'Fully paid' },
            { value: 'PARTIAL', label: 'Partial' },
            { value: 'UNPAID', label: 'Unpaid' },
          ]}
        />
      </FilterBar>

      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load transactions.' : null}
            onRetry={() => refetch()}
            rowKey={(t) => t.id}
            onRowClick={(t) => navigate(`/transactions/${t.id}`)}
            sort={{ key: filters.sort, direction: filters.direction as 'asc' | 'desc' }}
            onSortChange={(key) => {
              const next = new URLSearchParams(params)
              if (filters.sort === key) next.set('direction', filters.direction === 'asc' ? 'desc' : 'asc')
              else next.set('direction', 'desc')
              next.set('sort', key)
              setParams(next, { replace: true })
            }}
            emptyTitle="No transactions yet"
            emptyDescription="Create your first transaction to start tracking operational activity."
            emptyAction={
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New Transaction
              </Button>
            }
            pagination={
              data?.meta
                ? {
                    page: data.meta.current_page,
                    lastPage: data.meta.last_page,
                    total: data.meta.total,
                    onPageChange: (p) => update('page', String(p)),
                  }
                : undefined
            }
          />
        </div>
      </div>

      <CreateTransactionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
