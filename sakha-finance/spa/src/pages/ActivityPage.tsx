import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { FilterBar, FilterSelect, FilterDate, SearchInput } from '@/components/ui/Filters'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useActivity } from '@/lib/hooks'
import { formatDateTime, humanizeAction } from '@/lib/format'
import type { ActivityLog } from '@/types/api'

const ENTITY_TYPES = [
  { value: 'transaction', label: 'Transaksi' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment', label: 'Pembayaran' },
  { value: 'delivery', label: 'Pengiriman' },
  { value: 'document', label: 'Dokumen' },
  { value: 'archive', label: 'Arsip' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'procurement', label: 'Pengadaan' },
  { value: 'customer', label: 'Pelanggan' },
  { value: 'user', label: 'Pengguna' },
  { value: 'settings', label: 'Pengaturan' },
  { value: 'auth', label: 'Autentikasi' },
]

/** Actions grouped by the verb segment of the action key for the filter. */
const ACTION_GROUPS = [
  { value: 'created', label: 'Dibuat' },
  { value: 'updated', label: 'Diperbarui' },
  { value: 'status', label: 'Perubahan status' },
  { value: 'uploaded', label: 'Diunggah' },
  { value: 'verified', label: 'Diverifikasi' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'archived', label: 'Diarsipkan' },
  { value: 'login', label: 'Masuk' },
]

export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    entity_type: params.get('entity_type') ?? '',
    user_id: params.get('user_id') ?? '',
    action: params.get('action') ?? '',
    date_from: params.get('date_from') ?? '',
    date_to: params.get('date_to') ?? '',
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

  // Derive the user list from the loaded page so the filter works without an
  // extra admin-only request. It grows as the operator pages through history.
  const users = useMemo(() => {
    const seen = new Map<number, string>()
    ;(data?.data ?? []).forEach((l) => {
      if (l.user_id && l.user_name) seen.set(l.user_id, l.user_name)
    })
    return Array.from(seen.entries()).map(([value, label]) => ({ value: String(value), label }))
  }, [data])

  const columns: Column<ActivityLog>[] = [
    { key: 'time', header: 'Waktu', render: (l) => <span className="whitespace-nowrap text-2xs text-ink-500">{formatDateTime(l.created_at)}</span> },
    {
      key: 'user',
      header: 'Pengguna',
      render: (l) => (
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[9px] font-semibold text-ink-500">
            {(l.user_name ?? 'S').charAt(0).toUpperCase()}
          </span>
          <span className="text-xs text-ink-700">{l.user_name}</span>
        </div>
      ),
    },
    { key: 'action', header: 'Tindakan', render: (l) => <span className="text-xs font-medium text-ink-800">{humanizeAction(l.action)}</span> },
    {
      key: 'entity',
      header: 'Entitas',
      render: (l) => (
        <StatusBadge
          label={`${entityLabel(l.entity_type)}${l.entity_id ? ` #${l.entity_id}` : ''}`}
          tone="neutral"
          dot={false}
        />
      ),
    },
    { key: 'description', header: 'Keterangan', render: (l) => <span className="text-xs text-ink-600">{l.description}</span> },
  ]

  return (
    <div>
      <PageHeader title="Aktivitas" description="Jejak audit lengkap atas tindakan di seluruh ruang kerja." />
      <FilterBar>
        <SearchInput value={params.get('q') ?? ''} onChange={(v) => update('q', v)} placeholder="Cari keterangan…" className="w-full sm:w-56" />
        <FilterSelect label="Pengguna" value={filters.user_id} onChange={(v) => update('user_id', v)} placeholder="Semua pengguna" options={users} />
        <FilterSelect label="Entitas" value={filters.entity_type} onChange={(v) => update('entity_type', v)} placeholder="Semua entitas" options={ENTITY_TYPES} />
        <FilterSelect label="Tindakan" value={filters.action} onChange={(v) => update('action', v)} placeholder="Semua tindakan" options={ACTION_GROUPS} />
        <FilterDate label="Dari" value={filters.date_from} onChange={(v) => update('date_from', v)} />
        <FilterDate label="Sampai" value={filters.date_to} onChange={(v) => update('date_to', v)} />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Tidak dapat memuat aktivitas.' : null}
            onRetry={() => refetch()}
            rowKey={(l) => l.id}
            emptyTitle="Tidak ada aktivitas tercatat"
            emptyDescription="Tindakan yang dilakukan di seluruh ruang kerja akan ditampilkan di sini."
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

function entityLabel(entity: string | null): string {
  if (!entity) return '—'
  return ENTITY_TYPES.find((e) => e.value === entity)?.label ?? entity
}
