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
      header: 'Transaksi',
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{r.transaction_code}</p>
          <p className="text-2xs text-ink-400">{r.customer ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Transaksi',
      render: (r) => {
        const meta = metaFor(TRANSACTION_STATUS, r.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'verification',
      header: 'Verifikasi',
      render: (r) => {
        const meta = metaFor(VERIFICATION_STATUS, r.verification_status ?? '')
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'checks',
      header: 'Pemeriksaan',
      render: (r) => (
        <span className="text-2xs text-ink-500">
          <span className="text-bad-600">{r.failed_count} tidak sesuai</span> · <span className="text-warn-600">{r.warning_count} perlu diperiksa</span>
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Skor',
      align: 'right',
      render: (r) => <span className="tabular-nums text-sm font-medium text-ink-800">{r.score ?? '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Verifikasi"
        description="Transaksi yang verifikasi terbarunya tidak sesuai, atau yang ditandai untuk ditinjau."
      />
      <FilterBar>
        <p className="text-xs text-ink-500">
          Antrean ini menampilkan transaksi dengan <span className="text-warn-600">perlu diperiksa</span> atau{' '}
          <span className="text-bad-600">tidak sesuai</span>, serta semua yang ditandai <span className="text-ink-700">Perlu Ditinjau</span>.
        </p>
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Tidak dapat memuat antrean verifikasi.' : null}
            onRetry={() => refetch()}
            rowKey={(r) => r.transaction_id}
            onRowClick={(r) => navigate(`/transactions/${r.transaction_id}`)}
            emptyTitle="Tidak ada yang perlu diverifikasi"
            emptyDescription="Verifikasi terbaru setiap transaksi sudah sesuai."
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
