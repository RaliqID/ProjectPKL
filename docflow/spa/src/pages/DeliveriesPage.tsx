import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { useDeliveries } from '@/lib/hooks'
import { formatDate } from '@/lib/format'
import { COURIERS, DELIVERY_STATUS, metaFor } from '@/lib/status'
import type { Delivery } from '@/types/api'

export function DeliveriesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    courier: params.get('courier') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 15,
  }
  const { data, isLoading, error, refetch } = useDeliveries(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const columns: Column<Delivery>[] = [
    {
      key: 'number',
      header: 'Delivery',
      render: (d) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{d.delivery_number ?? `DO-${d.id}`}</p>
          <p className="text-2xs text-ink-400">{d.courier ?? '—'}</p>
        </div>
      ),
    },
    { key: 'tracking', header: 'Tracking', render: (d) => <span className="font-mono text-2xs text-ink-500">{d.tracking_number ?? '—'}</span> },
    {
      key: 'transaction',
      header: 'Transaction',
      render: (d) => (
        <div>
          <p className="font-mono text-2xs text-ink-600">{d.transaction?.transaction_code ?? '—'}</p>
          <p className="text-2xs text-ink-400">{d.transaction?.customer?.name ?? ''}</p>
        </div>
      ),
    },
    { key: 'shipping', header: 'Shipped', render: (d) => <span className="text-2xs text-ink-500">{formatDate(d.shipping_date)}</span> },
    {
      key: 'eta',
      header: 'ETA',
      render: (d) => (
        <span className={d.is_delayed ? 'text-2xs font-medium text-bad-600' : 'text-2xs text-ink-500'}>
          {formatDate(d.estimated_delivery_date)}
          {d.is_delayed ? ' · delayed' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const meta = metaFor(DELIVERY_STATUS, d.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  return (
    <div>
      <PageHeader title="Deliveries" description="Shipment tracking across couriers and transactions." />
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Search tracking, delivery, transaction…" className="w-full sm:w-64" />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => update('status', v)} placeholder="All statuses" options={Object.entries(DELIVERY_STATUS).map(([value, m]) => ({ value, label: m.label }))} />
        <FilterSelect label="Courier" value={filters.courier} onChange={(v) => update('courier', v)} placeholder="All couriers" options={COURIERS.map((c) => ({ value: c, label: c }))} />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load deliveries.' : null}
            onRetry={() => refetch()}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/transactions/${d.transaction_id}`)}
            emptyTitle="No deliveries found"
            emptyDescription="Deliveries created for transactions will appear here."
            pagination={
              data?.meta
                ? { page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total, onPageChange: (p) => update('page', String(p)) }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
