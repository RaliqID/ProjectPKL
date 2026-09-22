import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar } from '@/components/ui/Filters'
import { useVerificationQueue } from '@/lib/hooks'
import type { QueueRow } from '@/lib/hooks'
import { VERIFICATION_STATUS, TRANSACTION_STATUS, metaFor } from '@/lib/status'

export function VerificationPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const filters = { page: Number(params.get('page') ?? 1), per_page: 15 }
  const { data, isLoading, error, refetch } = useVerificationQueue(filters)

  const columns: Column<QueueRow>[] = [
    {
      key: 'transaction',
      header: 'Transaction',
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{r.transaction_code}</p>
          <p className="text-2xs text-ink-400">{r.customer ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Transaction Status',
      render: (r) => {
        const meta = metaFor(TRANSACTION_STATUS, r.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (r) => {
        const meta = metaFor(VERIFICATION_STATUS, r.verification_status ?? '')
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'checks',
      header: 'Checks',
      render: (r) => (
        <span className="text-2xs text-ink-500">
          <span className="text-bad-600">{r.failed_count} failed</span> · <span className="text-warn-600">{r.warning_count} warning</span>
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (r) => <span className="tabular-nums text-sm font-medium text-ink-800">{r.score ?? '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Verification"
        description="Transactions whose latest verification is not a clean pass, or that are flagged for review."
      />
      <FilterBar>
        <p className="text-xs text-ink-500">
          This queue lists transactions with <span className="text-warn-600">warnings</span> or{' '}
          <span className="text-bad-600">failures</span>, plus everything marked <span className="text-ink-700">Needs Review</span>.
        </p>
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load the verification queue.' : null}
            onRetry={() => refetch()}
            rowKey={(r) => r.transaction_id}
            onRowClick={(r) => navigate(`/transactions/${r.transaction_id}`)}
            emptyTitle="Nothing to verify"
            emptyDescription="Every transaction's latest verification is a clean pass."
            pagination={
              data?.meta
                ? { page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total, onPageChange: (p) => setParams({ page: String(p) }, { replace: true }) }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
