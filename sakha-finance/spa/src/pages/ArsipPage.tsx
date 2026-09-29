import { useState } from 'react'
import { Archive as ArchiveIcon, ChevronRight, Download, FileDown, FolderOpen, Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useArchives, useArchiveTree, useSyncArchives, useActivity, type ArchiveRow, type ArchiveTreeNode } from '@/lib/hooks'
import { formatDate, formatDateTime } from '@/lib/format'
import { DOCUMENT_STATUS, metaFor } from '@/lib/status'
import { useToast } from '@/lib/toast'
import { useAuth } from '@/lib/auth'
import { ApiError, api, downloadFile } from '@/lib/api'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function monthName(m: number): string {
  return MONTHS[m - 1] ?? String(m)
}

export function ArsipPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useArchives({
    search: search || undefined,
    document_type: type || undefined,
    year: year || undefined,
    month: month || undefined,
    page,
  })

  const { data: tree } = useArchiveTree()
  const sync = useSyncArchives()
  const toast = useToast()
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [detail, setDetail] = useState<ArchiveRow | null>(null)

  // Only administrators may archive (server enforces this too).
  const canArchive = user?.role === 'ADMIN'

  async function runExport() {
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (type) qs.set('document_type', type)
      if (year) qs.set('year', year)
      await downloadFile(`/api/reports/archives/export${qs.toString() ? `?${qs}` : ''}`, 'laporan-arsip.csv')
      toast.success('Laporan arsip diunduh.')
    } catch (err) {
      toast.error('Gagal mengunduh laporan arsip.', err instanceof Error ? err.message : undefined)
    } finally {
      setExporting(false)
    }
  }

  async function runPdf() {
    setPdfLoading(true)
    try {
      const qs = new URLSearchParams()
      if (type) qs.set('document_type', type)
      if (year) qs.set('year', year)
      await downloadFile(`/api/reports/archives/pdf${qs.toString() ? `?${qs}` : ''}`, 'laporan-arsip.pdf')
      toast.success('Laporan PDF diunduh.')
    } catch (err) {
      toast.error('Gagal mengunduh PDF.', err instanceof Error ? err.message : undefined)
    } finally {
      setPdfLoading(false)
    }
  }

  async function runEmail() {
    setEmailing(true)
    try {
      const res = await api.post<{ message: string }>('/api/reports/email', { type: 'archives' })
      toast.success(res.message)
    } catch (err) {
      toast.error('Gagal mengirim laporan.', err instanceof Error ? err.message : undefined)
    } finally {
      setEmailing(false)
    }
  }

  function runSync() {
    sync.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message ?? 'Arsip diperbarui.')
        refetch()
      },
      onError: (err) => {
        toast.error('Gagal menyusun arsip', err instanceof ApiError ? err.message : undefined)
      },
    })
  }

  const rows = data?.data ?? []
  const facets = data?.facets

  const columns: Column<ArchiveRow>[] = [
    {
      key: 'name',
      header: 'Nama Dokumen',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">{row.document_name}</p>
          {row.file_name ? <p className="truncate font-mono text-2xs text-ink-400">{row.file_name}</p> : null}
        </div>
      ),
    },
    {
      key: 'number',
      header: 'Nomor',
      render: (row) => <span className="font-mono text-xs text-ink-600">{row.document_number ?? '—'}</span>,
    },
    {
      key: 'type',
      header: 'Jenis',
      render: (row) => <span className="text-xs text-ink-700">{row.document_type_label ?? row.document_type}</span>,
    },
    {
      key: 'customer',
      header: 'Pelanggan',
      render: (row) => <span className="text-xs text-ink-600">{row.customer_name ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (row) => <span className="text-xs text-ink-600">{formatDate(row.document_date)}</span>,
    },
    {
      key: 'location',
      header: 'Lokasi Arsip',
      render: (row) => <span className="text-xs text-ink-500">{row.archive_location ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = metaFor(DOCUMENT_STATUS, row.status === 'STORED' ? 'ARCHIVED' : row.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Arsip"
        description="Arsip dokumen Finance tersusun per tahun, bulan, jenis, dan pelanggan."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={runEmail} disabled={emailing}>
              <Mail className="h-4 w-4" />
              {emailing ? 'Mengirim…' : 'Kirim ke Email'}
            </Button>
            <Button variant="secondary" onClick={runPdf} disabled={pdfLoading}>
              <FileDown className="h-4 w-4" />
              {pdfLoading ? 'Menyiapkan…' : 'PDF'}
            </Button>
            <Button variant="secondary" onClick={runExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? 'Menyiapkan…' : 'Ekspor CSV'}
            </Button>
            <Button variant="primary" onClick={runSync} disabled={sync.isPending || !canArchive}>
              <ArchiveIcon className="h-4 w-4" />
              {sync.isPending ? 'Menyusun…' : 'Susun Arsip Dokumen'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-4 lg:p-8">
        {/* Struktur arsip */}
        <aside className="df-card h-fit lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
            <FolderOpen className="h-4 w-4 text-ink-400" aria-hidden />
            <h2 className="text-sm font-semibold text-ink-900">Struktur Arsip</h2>
          </div>
          {!tree || tree.length === 0 ? (
            <p className="px-4 py-6 text-xs text-ink-400">Belum ada dokumen terarsip.</p>
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto py-1">
              {tree.map((node: ArchiveTreeNode) => (
                <li key={node.year}>
                  <button
                    type="button"
                    onClick={() => { setYear(String(node.year)); setMonth(''); setPage(1) }}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-ink-800 hover:bg-ink-50"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
                      {node.year}
                    </span>
                    <span className="text-2xs text-ink-400">{node.total}</span>
                  </button>
                  <ul className="border-l border-ink-100 pl-3">
                    {node.months.map((m) => (
                      <li key={`${node.year}-${m.month}`}>
                        <button
                          type="button"
                          onClick={() => { setYear(String(node.year)); setMonth(String(m.month)); setPage(1) }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-ink-600 hover:bg-ink-50"
                        >
                          <span>{monthName(m.month)}</span>
                          <span className="text-2xs text-ink-400">{m.total}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Daftar dokumen */}
        <div className="df-card lg:col-span-3">
          <div className="border-b border-ink-100 p-4">
            <FilterBar>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1) }}
                placeholder="Cari nama, nomor, atau pelanggan…"
              />
              <FilterSelect
                value={type}
                onChange={(v) => { setType(v); setPage(1) }}
                placeholder="Semua jenis"
                label="Filter jenis dokumen"
                options={(facets?.types ?? []).map((t) => ({ value: t.value, label: t.label }))}
              />
              <FilterSelect
                value={year}
                onChange={(v) => { setYear(v); setPage(1) }}
                placeholder="Semua tahun"
                label="Filter tahun"
                options={(facets?.years ?? []).map((y) => ({ value: String(y), label: String(y) }))}
              />
              <FilterSelect
                value={month}
                onChange={(v) => { setMonth(v); setPage(1) }}
                placeholder="Semua bulan"
                label="Filter bulan"
                options={MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))}
              />
            </FilterBar>
          </div>

          {year || month || type || search ? (
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2">
              <p className="text-xs text-ink-500">Filter aktif</p>
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => { setSearch(''); setType(''); setYear(''); setMonth(''); setPage(1) }}
              >
                Reset filter
              </Button>
            </div>
          ) : null}

          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            error={error ? 'Gagal memuat arsip.' : null}
            onRetry={() => refetch()}
            emptyTitle="Belum ada dokumen di arsip"
            emptyDescription="Dokumen yang telah diarsipkan akan tampil di sini."
            rowKey={(row) => row.id}
            onRowClick={(row) => setDetail(row)}
            pagination={
              data?.meta
                ? {
                    page: data.meta.current_page,
                    lastPage: data.meta.last_page,
                    total: data.meta.total,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />

          {!isLoading && rows.length === 0 && !search && !type && !year && !month ? (
            <EmptyState
              title="Arsip masih kosong"
              description="Arsipkan dokumen dari halaman Dokumen untuk mulai menyusun arsip."
              icon={<ArchiveIcon className="h-5 w-5 text-ink-400" />}
            />
          ) : null}
        </div>
      </div>

      <DetailModal row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

/** Read-only metadata view for a single archive entry, with its activity trail. */
function DetailModal({ row, onClose }: { row: ArchiveRow | null; onClose: () => void }) {
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  // Load the activity trail for this archive entry (and its document, when
  // linked) so the modal shows how the file got here.
  const { data: activity } = useActivity(
    row ? { entity_type: 'archive', entity_id: row.id, per_page: 10 } : { per_page: 1 },
  )
  const trail = row ? activity?.data ?? [] : []

  async function downloadDocument() {
    if (!row?.document_id) return
    setDownloading(true)
    try {
      await downloadFile(`/api/documents/${row.document_id}/download`, row.file_name ?? 'dokumen.pdf')
    } catch (err) {
      toast.error('Gagal mengunduh dokumen.', err instanceof Error ? err.message : undefined)
    } finally {
      setDownloading(false)
    }
  }

  const rows: [string, string][] = row
    ? [
        ['Kode Arsip', row.archive_code],
        ['Nama Dokumen', row.document_name],
        ['Nomor Dokumen', row.document_number ?? '—'],
        ['Jenis Dokumen', row.document_type_label ?? row.document_type],
        ['Pelanggan', row.customer_name ?? '—'],
        ['Tanggal Dokumen', formatDate(row.document_date)],
        ['Periode', `${row.period_year} / ${String(row.period_month).padStart(2, '0')}`],
        ['Lokasi Arsip', row.archive_location ?? '—'],
        ['Nama Berkas', row.file_name ?? '—'],
        ['Kode Transaksi', row.transaction_code ?? '—'],
        ['Status', row.status === 'STORED' ? 'Diarsipkan' : row.status],
      ]
    : []

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      title={row ? `Detail Arsip — ${row.archive_code}` : 'Detail Arsip'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          {row?.document_id ? (
            <Button variant="primary" onClick={downloadDocument} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Mengunduh…' : 'Unduh Dokumen'}
            </Button>
          ) : null}
        </>
      }
    >
      <dl className="divide-y divide-ink-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-6 py-2.5">
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="text-right text-xs font-medium text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>

      {trail.length > 0 ? (
        <div className="mt-4 border-t border-ink-100 pt-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">Riwayat Arsip</p>
          <ul className="space-y-2">
            {trail.map((log) => (
              <li key={log.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-700">{log.description}</p>
                  <p className="text-2xs text-ink-400">
                    {log.user_name} · {formatDateTime(log.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  )
}
