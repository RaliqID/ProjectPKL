import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { useDocuments } from '@/lib/hooks'
import { formatDateTime } from '@/lib/format'
import { DOCUMENT_STATUS, DOCUMENT_TYPES, metaFor } from '@/lib/status'
import type { Document } from '@/types/api'

export function DocumentsPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    document_type: params.get('document_type') ?? '',
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
      <PageHeader title="Documents" description="Every uploaded operational document, searchable and filterable." />
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Search file, number, transaction…" className="w-full sm:w-64" />
        <FilterSelect label="Type" value={filters.document_type} onChange={(v) => update('document_type', v)} placeholder="All types" options={DOCUMENT_TYPES} />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => update('status', v)}
          placeholder="All statuses"
          options={Object.entries(DOCUMENT_STATUS).map(([value, m]) => ({ value, label: m.label }))}
        />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load documents.' : null}
            onRetry={() => refetch()}
            rowKey={(d) => d.id}
            emptyTitle="No documents found"
            emptyDescription="Try adjusting the filters, or upload documents from a transaction."
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
