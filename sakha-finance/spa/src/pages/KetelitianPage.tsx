import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, Download, FileDown, HelpCircle, Mail, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { useKetelitian, type AccuracyRow } from '@/lib/hooks'
import { api, downloadFile } from '@/lib/api'
import { useToast } from '@/lib/toast'
import type { Tone } from '@/types/api'

/** Result → label + tone, kept local so wording stays consistent here. */
const RESULT_META: Record<string, { label: string; tone: Tone }> = {
  SESUAI: { label: 'Sesuai', tone: 'success' },
  PERLU_DIPERIKSA: { label: 'Perlu Diperiksa', tone: 'warning' },
  TIDAK_SESUAI: { label: 'Tidak Sesuai', tone: 'danger' },
}

function resultMeta(status: string) {
  return RESULT_META[status] ?? { label: status, tone: 'neutral' as Tone }
}

export function KetelitianPage() {
  const [search, setSearch] = useState('')
  const [result, setResult] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingDetail, setExportingDetail] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const toast = useToast()

  const { data, isLoading, error, refetch } = useKetelitian({
    search: search || undefined,
    result: result || undefined,
    page,
  })

  const rows = data?.data ?? []

  const columns: Column<AccuracyRow>[] = [
    {
      key: 'code',
      header: 'Transaksi',
      render: (row) => (
        <button
          type="button"
          data-row-click-stop
          onClick={() => setExpanded(expanded === row.transaction_id ? null : row.transaction_id)}
          className="font-mono text-xs font-medium text-accent-700 hover:underline"
        >
          {row.transaction_code}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Pelanggan',
      render: (row) => <span className="text-sm text-ink-700">{row.customer ?? '—'}</span>,
    },
    {
      key: 'checks',
      header: 'Pemeriksaan',
      render: (row) => (
        <span className="text-xs text-ink-500">
          {row.total} pemeriksaan
        </span>
      ),
    },
    {
      key: 'breakdown',
      header: 'Ringkasan',
      render: (row) => (
        <span className="flex items-center gap-3 text-2xs">
          <span className="flex items-center gap-1 text-ok-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {row.sesuai}
          </span>
          <span className="flex items-center gap-1 text-warn-600">
            <HelpCircle className="h-3.5 w-3.5" /> {row.perlu_diperiksa}
          </span>
          <span className="flex items-center gap-1 text-bad-600">
            <XCircle className="h-3.5 w-3.5" /> {row.tidak_sesuai}
          </span>
        </span>
      ),
    },
    {
      key: 'overall',
      header: 'Hasil',
      render: (row) => {
        const meta = resultMeta(row.overall)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  async function runExport(detail = false) {
    setExporting(true)
    setExportingDetail(detail)
    try {
      const url = detail ? '/api/reports/ketelitian/detail/export' : '/api/reports/ketelitian/export'
      const name = detail ? 'ketelitian-detail.csv' : 'ketelitian.csv'
      await downloadFile(url, name)
      toast.success('Laporan diunduh.')
    } catch (err) {
      toast.error('Gagal mengunduh laporan.', err instanceof Error ? err.message : undefined)
    } finally {
      setExporting(false)
      setExportingDetail(false)
    }
  }

  async function runPdf() {
    setPdfLoading(true)
    try {
      await downloadFile('/api/reports/ketelitian/pdf', 'laporan-ketelitian.pdf')
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
      const res = await api.post<{ message: string }>('/api/reports/email', { type: 'ketelitian' })
      toast.success(res.message)
    } catch (err) {
      toast.error('Gagal mengirim laporan.', err instanceof Error ? err.message : undefined)
    } finally {
      setEmailing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pemeriksaan Ketelitian"
        description="Pemeriksaan ketelitian data transaksi & invoice berdasarkan aturan yang tetap dan dapat dijelaskan."
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
            <Button variant="secondary" onClick={() => runExport(true)} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exportingDetail ? 'Menyiapkan…' : 'Ekspor Detail'}
            </Button>
            <Button variant="secondary" onClick={() => runExport(false)} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting && !exportingDetail ? 'Menyiapkan…' : 'Ekspor Ringkasan'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="df-card flex items-start gap-3 p-4">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-600">
            Setiap transaksi diperiksa pada lima aspek: pelanggan, nomor invoice, tanggal invoice, nilai invoice, dan
            kelengkapan dokumen. Pemeriksaan ini tidak menggunakan AI — hasilnya berasal dari aturan yang tetap dan
            setiap temuan disertai alasan.
          </p>
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 p-4">
            <FilterBar>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1) }}
                placeholder="Cari kode transaksi atau pelanggan…"
              />
              <FilterSelect
                value={result}
                onChange={(v) => { setResult(v); setPage(1) }}
                placeholder="Semua hasil"
                label="Filter hasil pemeriksaan"
                options={[
                  { value: 'SESUAI', label: 'Sesuai' },
                  { value: 'PERLU_DIPERIKSA', label: 'Perlu Diperiksa' },
                  { value: 'TIDAK_SESUAI', label: 'Tidak Sesuai' },
                ]}
              />
            </FilterBar>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            error={error ? 'Gagal memuat pemeriksaan ketelitian.' : null}
            onRetry={() => refetch()}
            emptyTitle="Belum ada data untuk diperiksa"
            emptyDescription="Transaksi yang memiliki invoice akan diperiksa di sini."
            rowKey={(row) => row.transaction_id}
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
        </div>

        {/* Rincian per pemeriksaan */}
        {expanded !== null
          ? rows
              .filter((r) => r.transaction_id === expanded)
              .map((row) => (
                <div key={row.transaction_id} className="df-card">
                  <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-ink-900">
                        Rincian Pemeriksaan — <span className="font-mono">{row.transaction_code}</span>
                      </h2>
                      <p className="mt-0.5 text-2xs text-ink-400">{row.customer ?? 'Tanpa pelanggan'}</p>
                    </div>
                    <StatusBadge label={resultMeta(row.overall).label} tone={resultMeta(row.overall).tone} />
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {row.checks.map((check) => {
                      const meta = resultMeta(check.status)
                      return (
                        <li key={check.key} className="flex items-start gap-3 px-5 py-3">
                          <StatusBadge label={meta.label} tone={meta.tone} dot={false} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink-800">{check.label}</p>
                            <p className="mt-0.5 text-xs text-ink-500">{check.message}</p>
                            {check.expected || check.actual ? (
                              <p className="mt-1 font-mono text-2xs text-ink-400">
                                {check.expected ? `Seharusnya: ${check.expected}` : ''}
                                {check.expected && check.actual ? '  ·  ' : ''}
                                {check.actual ? `Tercatat: ${check.actual}` : ''}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
          : null}
      </div>
    </div>
  )
}
