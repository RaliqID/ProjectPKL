import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { useDocuments } from '@/lib/hooks'
import { DocumentReviewNote } from '@/components/RoleBadge'
import { formatDateTime } from '@/lib/format'
import { DOCUMENT_STATUS, DOCUMENT_TYPES, metaFor } from '@/lib/status'
import type { Document } from '@/types/api'
import clsx from 'clsx'

/** Tabs = "All" plus every document type, so every operational document has a home. */
const TYPE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...DOCUMENT_TYPES,
]

export function DocumentsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const activeType = params.get('document_type') ?? ''
  const filters = {
    q: params.get('q') ?? '',
    document_type: activeType,
    status: params.get('status') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 15,
  }
  const { data, isLoading, error, refetch } = useDocuments(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const columns: Column<Document>[] = [
    {
      key: 'file',
      header: 'File',
      render: (d) => (
        <div className="min-w-0">
          <p className="max-w-[280px] truncate text-xs font-medium text-ink-800">{d.original_filename}</p>
          <p className="text-2xs text-ink-400">v{d.current_version} · {d.file_size_label}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (d) => <span className="text-xs text-ink-600">{d.document_type_label}</span> },
    {
      key: 'document_number',
      header: 'Number',
      render: (d) => <span className="font-mono text-2xs text-ink-500">{d.document_number ?? '—'}</span>,
    },
    {
      key: 'transaction',
      header: 'Transaction',
      render: (d) => <span className="font-mono text-2xs text-ink-500">{d.transaction_code ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const meta = metaFor(DOCUMENT_STATUS, d.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    { key: 'uploaded', header: 'Uploaded', render: (d) => <span className="text-2xs text-ink-400">{formatDateTime(d.uploaded_at)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Every uploaded operational document, grouped by type — from invoices to journals."
      />

      {/* Type tabs */}
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Document types">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => update('document_type', t.value)}
              aria-current={activeType === t.value ? 'page' : undefined}
              className={clsx(
                'whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                activeType === t.value
                  ? 'border-accent-600 text-accent-700'
                  : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Search file, number, transaction…" className="w-full sm:w-64" />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => update('status', v)}
          placeholder="All statuses"
          options={Object.entries(DOCUMENT_STATUS).map(([value, m]) => ({ value, label: m.label }))}
        />
      </FilterBar>

      <div className="p-6 lg:p-8">
        <DocumentReviewNote />
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load documents.' : null}
            onRetry={() => refetch()}
            rowKey={(d) => d.id}
            onRowClick={(d) => d.transaction_id && navigate(`/app/transactions/${d.transaction_id}`)}
            emptyTitle="No documents yet"
            emptyDescription="No documents match this type and filter. Try another type tab or clear the filters."
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
