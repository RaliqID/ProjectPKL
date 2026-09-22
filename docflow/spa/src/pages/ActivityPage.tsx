import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { FilterBar, FilterSelect, FilterDate } from '@/components/ui/Filters'
import { useActivity } from '@/lib/hooks'
import { formatDateTime, humanizeAction } from '@/lib/format'
import type { ActivityLog } from '@/types/api'

const ENTITY_TYPES = [
  { value: 'transaction', label: 'Transaction' },
  { value: 'document', label: 'Document' },
  { value: 'customer', label: 'Customer' },
  { value: 'user', label: 'User' },
  { value: 'settings', label: 'Settings' },
  { value: 'auth', label: 'Auth' },
]

export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    entity_type: params.get('entity_type') ?? '',
    date_from: params.get('date_from') ?? '',
    date_to: params.get('date_to') ?? '',
    action: params.get('action') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 25,
  }
  const { data, isLoading, error, refetch } = useActivity(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const columns: Column<ActivityLog>[] = [
    { key: 'time', header: 'When', render: (l) => <span className="whitespace-nowrap text-2xs text-ink-500">{formatDateTime(l.created_at)}</span> },
    { key: 'user', header: 'User', render: (l) => <span className="text-xs text-ink-700">{l.user_name}</span> },
    { key: 'action', header: 'Action', render: (l) => <span className="text-xs font-medium text-ink-800">{humanizeAction(l.action)}</span> },
    {
      key: 'entity',
      header: 'Entity',
      render: (l) => (
        <span className="font-mono text-2xs text-ink-500">
          {l.entity_type}
          {l.entity_id ? ` #${l.entity_id}` : ''}
        </span>
      ),
    },
    { key: 'description', header: 'Description', render: (l) => <span className="text-xs text-ink-600">{l.description}</span> },
  ]

  return (
    <div>
      <PageHeader title="Activity" description="Full audit trail of actions across the workspace." />
      <FilterBar>
        <FilterSelect label="Entity" value={filters.entity_type} onChange={(v) => update('entity_type', v)} placeholder="All entities" options={ENTITY_TYPES} />
        <FilterDate label="From" value={filters.date_from} onChange={(v) => update('date_from', v)} />
        <FilterDate label="To" value={filters.date_to} onChange={(v) => update('date_to', v)} />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load activity.' : null}
            onRetry={() => refetch()}
            rowKey={(l) => l.id}
            emptyTitle="No activity recorded"
            emptyDescription="Actions taken across the workspace will be listed here."
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
