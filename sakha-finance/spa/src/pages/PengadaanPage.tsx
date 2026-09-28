import { useState } from 'react'
import { Download, FileDown, Mail, Plus, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Metric } from '@/components/ui/Metric'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterDate, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextInput, Select } from '@/components/ui/Form'
import { useCreateProcurement, useProcurements, type ProcurementRow } from '@/lib/hooks'
import { formatDate, formatIDR } from '@/lib/format'
import { api, downloadFile } from '@/lib/api'
import { useToast } from '@/lib/toast'
import type { Tone } from '@/types/api'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: 'Diminta', tone: 'neutral' },
  ORDERED: { label: 'Dipesan', tone: 'info' },
  SHIPPED: { label: 'Dikirim', tone: 'info' },
  RECEIVED: { label: 'Diterima', tone: 'success' },
  CANCELLED: { label: 'Dibatalkan', tone: 'muted' },
}

export function PengadaanPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [detail, setDetail] = useState<ProcurementRow | null>(null)
  const toast = useToast()

  const { data, isLoading, error, refetch } = useProcurements({
    search: search || undefined,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
  })

  const rows = data?.data ?? []
  const summary = data?.summary

  const columns: Column<ProcurementRow>[] = [
    {
      key: 'code',
      header: 'Nomor',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{row.procurement_code}</p>
          {row.spb_number ? <p className="text-2xs text-ink-400">SPB: {row.spb_number}</p> : null}
        </div>
      ),
    },
    { key: 'date', header: 'Tanggal', render: (row) => <span className="text-xs text-ink-600">{formatDate(row.request_date)}</span> },
    { key: 'item', header: 'Barang', render: (row) => <span className="text-sm text-ink-700">{row.item_name}</span> },
    { key: 'supplier', header: 'Marketplace / Supplier', render: (row) => <span className="text-xs text-ink-600">{row.supplier ?? '—'}</span> },
    {
      key: 'qty',
      header: 'Jumlah',
      align: 'right',
      render: (row) => <span className="text-xs tabular-nums text-ink-600">{row.quantity} {row.unit ?? ''}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="text-sm font-medium tabular-nums text-ink-800">{formatIDR(row.total_amount)}</span>,
    },
    { key: 'resi', header: 'Resi', render: (row) => <span className="font-mono text-2xs text-ink-500">{row.tracking_number ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = STATUS[row.status] ?? { label: row.status, tone: 'neutral' as Tone }
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  async function runExport() {
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      await downloadFile(`/api/reports/procurements/export${qs.toString() ? `?${qs}` : ''}`, 'pengadaan.csv')
      toast.success('Laporan diunduh.')
    } catch {
      toast.error('Gagal mengunduh laporan.')
    } finally {
      setExporting(false)
    }
  }

  async function runPdf() {
    setPdfLoading(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      await downloadFile(`/api/reports/procurements/pdf${qs.toString() ? `?${qs}` : ''}`, 'laporan-pengadaan.pdf')
      toast.success('Laporan PDF diunduh.')
    } catch {
      toast.error('Gagal mengunduh PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function runEmail() {
    setEmailing(true)
    try {
      const res = await api.post<{ message: string }>('/api/reports/email', { type: 'procurements' })
      toast.success(res.message)
    } catch {
      toast.error('Gagal mengirim laporan.')
    } finally {
      setEmailing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengadaan"
        description="Catatan pengadaan barang dan Buku SPB (ringan) — barang, supplier, harga, jumlah, resi, dan status."
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
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Catat Pengadaan
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Total (halaman ini)" value={formatIDR(summary?.total_amount ?? '0')} icon={<ShoppingCart className="h-4 w-4" />} spark={data?.trends} />
          <Metric label="Diminta" value={summary?.requested ?? '—'} />
          <Metric label="Dikirim" value={summary?.shipped ?? '—'} tone="info" />
          <Metric label="Diterima" value={summary?.received ?? '—'} tone="success" />
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 p-4">
            <FilterBar>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1) }}
                placeholder="Cari nomor, barang, supplier, resi…"
              />
              <FilterSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1) }}
                placeholder="Semua status"
                label="Filter status"
                options={Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
              />
              <FilterDate value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1) }} label="Dari tanggal" />
              <FilterDate value={dateTo} onChange={(v) => { setDateTo(v); setPage(1) }} label="Sampai tanggal" />
            </FilterBar>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            error={error ? 'Gagal memuat daftar pengadaan.' : null}
            onRetry={() => refetch()}
            emptyTitle="Belum ada pengadaan"
            emptyDescription="Catatan pengadaan barang akan tampil di sini."
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
        </div>
      </div>

      <CreateProcurementModal open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refetch() }} />
      <ProcurementDetailModal row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

/** Read-only detail view for one procurement / SPB record. */
function ProcurementDetailModal({ row, onClose }: { row: ProcurementRow | null; onClose: () => void }) {
  const meta = row ? STATUS[row.status] ?? { label: row.status, tone: 'neutral' as Tone } : null

  const fields: [string, string][] = row
    ? [
        ['Kode', row.procurement_code],
        ['Nomor SPB', row.spb_number ?? '—'],
        ['Tanggal', formatDate(row.request_date)],
        ['Barang', row.item_name],
        ['Marketplace / Supplier', row.supplier ?? '—'],
        ['Harga Satuan', formatIDR(row.unit_price)],
        ['Jumlah', `${row.quantity} ${row.unit ?? ''}`.trim()],
        ['Total', formatIDR(row.total_amount)],
        ['Divisi', row.division ?? '—'],
        ['Keperluan', row.purpose ?? '—'],
        ['Nomor Resi', row.tracking_number ?? '—'],
        ['Catatan', row.notes ?? '—'],
      ]
    : []

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      title={row ? `Detail Pengadaan — ${row.procurement_code}` : 'Detail Pengadaan'}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {meta ? (
        <div className="mb-3">
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
      ) : null}
      <dl className="divide-y divide-ink-100">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-6 py-2.5">
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="text-right text-xs font-medium text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

function CreateProcurementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    spb_number: '',
    request_date: new Date().toISOString().slice(0, 10),
    item_name: '',
    supplier: '',
    unit_price: '',
    quantity: '1',
    unit: 'pcs',
    division: '',
    purpose: '',
    tracking_number: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateProcurement()
  const toast = useToast()

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit() {
    setErrors({})
    create.mutate(
      { ...form, unit_price: Number(form.unit_price), quantity: Number(form.quantity) },
      {
        onSuccess: () => {
          toast.success('Pengadaan berhasil dicatat.')
          onSaved()
        },
        onError: (err: unknown) => {
          const e = err as { errors?: Record<string, string[]> }
          if (e?.errors) {
            setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])))
          } else {
            toast.error('Gagal menyimpan pengadaan.')
          }
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Pengadaan"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput label="Tanggal" type="date" required value={form.request_date} onChange={(e) => set('request_date', e.target.value)} error={errors.request_date} />
        <TextInput label="Nomor SPB" value={form.spb_number} onChange={(e) => set('spb_number', e.target.value)} placeholder="cth. SPB-2026-0012" error={errors.spb_number} />
        <TextInput label="Barang" required value={form.item_name} onChange={(e) => set('item_name', e.target.value)} placeholder="cth. Kertas A4 80gsm" error={errors.item_name} />
        <TextInput label="Marketplace / Supplier" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="cth. Tokopedia" error={errors.supplier} />
        <TextInput label="Harga Satuan (Rp)" type="number" required value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} placeholder="cth. 55000" error={errors.unit_price} />
        <TextInput label="Jumlah" type="number" required value={form.quantity} onChange={(e) => set('quantity', e.target.value)} error={errors.quantity} />
        <Select
          label="Satuan"
          value={form.unit}
          onChange={(e) => set('unit', e.target.value)}
          options={['pcs', 'unit', 'box', 'rim', 'lusin'].map((u) => ({ value: u, label: u }))}
        />
        <TextInput label="Divisi" value={form.division} onChange={(e) => set('division', e.target.value)} placeholder="cth. Finance" error={errors.division} />
        <div className="sm:col-span-2">
          <TextInput label="Keperluan" value={form.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="cth. Kebutuhan ATK bulanan" error={errors.purpose} />
        </div>
        <div className="sm:col-span-2">
          <TextInput label="Nomor Resi" value={form.tracking_number} onChange={(e) => set('tracking_number', e.target.value)} placeholder="cth. JNE-0012345" error={errors.tracking_number} />
        </div>
      </div>
    </Modal>
  )
}
