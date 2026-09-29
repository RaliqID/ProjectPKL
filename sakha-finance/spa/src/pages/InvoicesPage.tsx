import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileDown, Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Metric } from '@/components/ui/Metric'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { useInvoices, type InvoiceSummary } from '@/lib/hooks'
import { formatDate, formatIDR } from '@/lib/format'
import { INVOICE_STATUS, metaFor } from '@/lib/status'
import { api, downloadFile } from '@/lib/api'
import { useToast } from '@/lib/toast'
import type { Invoice } from '@/types/api'

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [overdue, setOverdue] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useInvoices({
    search: search || undefined,
    status: status || undefined,
    overdue: overdue || undefined,
    page,
  })

  const invoices = data?.data ?? []
  const summary: InvoiceSummary | undefined = data?.summary

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Nomor Invoice',
      render: (row) => <span className="font-mono text-xs font-medium text-ink-800">{row.invoice_number}</span>,
    },
    {
      key: 'customer',
      header: 'Pelanggan',
      render: (row) => <span className="text-sm text-ink-700">{row.customer_name ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (row) => <span className="text-xs text-ink-600">{formatDate(row.invoice_date)}</span>,
    },
    {
      key: 'due',
      header: 'Jatuh Tempo',
      render: (row) => (
        <span className={row.is_overdue ? 'text-xs font-medium text-bad-600' : 'text-xs text-ink-600'}>
          {formatDate(row.due_date)}
          {row.is_overdue ? ` · ${row.days_overdue}h` : ''}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Nilai',
      align: 'right',
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-ink-800">{formatIDR(row.total ?? row.amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = metaFor(INVOICE_STATUS, row.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  async function runExport() {
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      await downloadFile(`/api/reports/invoices/export${qs.toString() ? `?${qs}` : ''}`, 'invoice.csv')
      toast.success('Laporan diunduh.')
    } catch (err) {
      toast.error('Gagal mengunduh laporan.', err instanceof Error ? err.message : undefined)
    } finally {
      setExporting(false)
    }
  }

  async function runPdf() {
    setPdfLoading(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      await downloadFile(`/api/reports/invoices/pdf${qs.toString() ? `?${qs}` : ''}`, 'laporan-invoice.pdf')
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
      const res = await api.post<{ message: string }>('/api/reports/email', { type: 'invoices' })
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
        title="Invoice"
        description="Daftar invoice beserta status pembayaran dan jatuh temponya."
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
              <Download className="h-4 w-4" />{exporting ? 'Menyiapkan…' : 'Ekspor CSV'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Total Invoice" value={summary?.total ?? '—'} sub={`${summary?.unpaid ?? 0} belum lunas`} />
          <Metric
            label="Jatuh Tempo"
            value={summary?.overdue ?? '—'}
            sub="melewati tanggal jatuh tempo"
            tone={(summary?.overdue ?? 0) > 0 ? 'danger' : 'success'}
          />
          <Metric label="Sudah Lunas" value={summary?.paid ?? '—'} tone="success" />
          <Metric label="Nilai Belum Dibayar" value={formatIDR(summary?.outstanding_amount ?? '0')} tone="warning" />
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 p-4">
            <FilterBar>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari nomor invoice, pelanggan…" />
              <FilterSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1) }}
                placeholder="Semua status"
                label="Filter status"
                options={Object.entries(INVOICE_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
              />
              <FilterSelect
                value={overdue}
                onChange={(v) => { setOverdue(v); setPage(1) }}
                placeholder="Semua invoice"
                label="Filter jatuh tempo"
                options={[
                  { value: 'true', label: 'Hanya jatuh tempo' },
                  { value: 'false', label: 'Belum jatuh tempo' },
                ]}
              />
            </FilterBar>
          </div>

          <DataTable
            columns={columns}
            rows={invoices}
            loading={isLoading}
            error={error ? 'Gagal memuat daftar invoice.' : null}
            onRetry={() => refetch()}
            emptyTitle="Belum ada invoice"
            emptyDescription="Invoice yang diterbitkan akan tampil di sini."
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/app/transaksi/${row.transaction_id}`)}
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
      </div>
    </div>
  )
}
