import { useState } from 'react'
import { Download, FileDown, Fuel, Mail, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Metric } from '@/components/ui/Metric'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterDate, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextInput, Select } from '@/components/ui/Form'
import { useCreateExpense, useExpenses, type ExpenseRow } from '@/lib/hooks'
import { formatDate, formatIDR } from '@/lib/format'
import { api, downloadFile } from '@/lib/api'
import { useToast } from '@/lib/toast'

const STATUS: Record<string, { label: string; tone: 'neutral' | 'warning' | 'success' | 'danger' | 'muted' }> = {
  DRAFT: { label: 'Draf', tone: 'neutral' },
  SUBMITTED: { label: 'Diajukan', tone: 'warning' },
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
  PAID: { label: 'Dibayar', tone: 'success' },
}

const FUEL_TYPES = ['Pertalite', 'Pertamax', 'Pertamax Turbo', 'Solar', 'Dexlite', 'Pertamina Dex']

export function PengeluaranPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [detail, setDetail] = useState<ExpenseRow | null>(null)
  const toast = useToast()

  const { data, isLoading, error, refetch } = useExpenses({
    search: search || undefined,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
  })

  const rows = data?.data ?? []
  const summary = data?.summary

  const columns: Column<ExpenseRow>[] = [
    {
      key: 'code',
      header: 'Kode',
      render: (row) => <span className="font-mono text-xs font-medium text-ink-800">{row.expense_code}</span>,
    },
    { key: 'date', header: 'Tanggal', render: (row) => <span className="text-xs text-ink-600">{formatDate(row.expense_date)}</span> },
    { key: 'vehicle', header: 'Kendaraan', render: (row) => <span className="text-xs text-ink-700">{row.vehicle ?? '—'}</span> },
    {
      key: 'km',
      header: 'KM',
      align: 'right',
      render: (row) => <span className="text-xs tabular-nums text-ink-600">{row.odometer_km?.toLocaleString('id-ID') ?? '—'}</span>,
    },
    { key: 'station', header: 'SPBU', render: (row) => <span className="text-xs text-ink-600">{row.station ?? '—'}</span> },
    { key: 'fuel', header: 'Jenis BBM', render: (row) => <span className="text-xs text-ink-600">{row.fuel_type ?? '—'}</span> },
    {
      key: 'amount',
      header: 'Nominal',
      align: 'right',
      render: (row) => <span className="text-sm font-medium tabular-nums text-ink-800">{formatIDR(row.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = STATUS[row.status] ?? { label: row.status, tone: 'neutral' as const }
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  async function runExport() {
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      await downloadFile(`/api/reports/expenses/export${qs.toString() ? `?${qs}` : ''}`, 'pengeluaran.csv')
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
      if (dateFrom) qs.set('date_from', dateFrom)
      if (dateTo) qs.set('date_to', dateTo)
      await downloadFile(`/api/reports/expenses/pdf${qs.toString() ? `?${qs}` : ''}`, 'laporan-pengeluaran.pdf')
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
      const res = await api.post<{ message: string }>('/api/reports/email', { type: 'expenses' })
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
        title="Pengeluaran"
        description="Pengeluaran operasional Finance — terutama klaim bensin (BBM) kendaraan."
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
              <Plus className="h-4 w-4" /> Catat Pengeluaran
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Total (halaman ini)" value={formatIDR(summary?.total_amount ?? '0')} icon={<Fuel className="h-4 w-4" />} spark={data?.trends} />
          <Metric label="Draf" value={summary?.draft ?? '—'} />
          <Metric label="Diajukan" value={summary?.submitted ?? '—'} tone="warning" />
          <Metric label="Disetujui" value={summary?.approved ?? '—'} tone="success" />
        </div>

        <div className="df-card">
          <div className="border-b border-ink-100 p-4">
            <FilterBar>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1) }}
                placeholder="Cari kode, kendaraan, SPBU…"
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
            error={error ? 'Gagal memuat daftar pengeluaran.' : null}
            onRetry={() => refetch()}
            emptyTitle="Belum ada pengeluaran"
            emptyDescription="Catat klaim bensin atau pengeluaran operasional lainnya."
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

      <CreateExpenseModal open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refetch() }} />
      <ExpenseDetailModal row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

/** Read-only detail view for one expense. */
function ExpenseDetailModal({ row, onClose }: { row: ExpenseRow | null; onClose: () => void }) {
  const meta = row ? STATUS[row.status] ?? { label: row.status, tone: 'neutral' as const } : null

  const fields: [string, string][] = row
    ? [
        ['Kode', row.expense_code],
        ['Kategori', row.category === 'FUEL' ? 'Bensin (BBM)' : row.category === 'TOLL' ? 'E-Toll' : 'Lainnya'],
        ['Tanggal', formatDate(row.expense_date)],
        ['Kendaraan', row.vehicle ?? '—'],
        ['Kilometer', row.odometer_km ? row.odometer_km.toLocaleString('id-ID') : '—'],
        ['SPBU', row.station ?? '—'],
        ['Jenis BBM', row.fuel_type ?? '—'],
        ['Nominal', formatIDR(row.amount)],
        ['No. Bukti', row.proof_reference ?? '—'],
        ['Catatan', row.notes ?? '—'],
      ]
    : []

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      title={row ? `Detail Pengeluaran — ${row.expense_code}` : 'Detail Pengeluaran'}
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

function CreateExpenseModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: 'FUEL',
    vehicle: '',
    odometer_km: '',
    station: '',
    fuel_type: 'Pertalite',
    amount: '',
    proof_reference: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateExpense()
  const toast = useToast()

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit() {
    setErrors({})
    create.mutate(
      {
        ...form,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : undefined,
        amount: Number(form.amount),
      },
      {
        onSuccess: () => {
          toast.success('Pengeluaran berhasil dicatat.')
          onSaved()
        },
        onError: (err: unknown) => {
          const e = err as { errors?: Record<string, string[]> }
          if (e?.errors) {
            setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])))
          } else {
            toast.error('Gagal menyimpan pengeluaran.')
          }
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Pengeluaran"
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
        <TextInput
          label="Tanggal"
          type="date"
          required
          value={form.expense_date}
          onChange={(e) => set('expense_date', e.target.value)}
          error={errors.expense_date}
        />
        <Select
          label="Kategori"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          options={[
            { value: 'FUEL', label: 'Bensin (BBM)' },
            { value: 'TOLL', label: 'E-Toll' },
            { value: 'OTHER', label: 'Lainnya' },
          ]}
        />
        <TextInput
          label="Kendaraan"
          value={form.vehicle}
          onChange={(e) => set('vehicle', e.target.value)}
          placeholder="cth. B 1234 XYZ"
          error={errors.vehicle}
        />
        <TextInput
          label="Kilometer"
          type="number"
          value={form.odometer_km}
          onChange={(e) => set('odometer_km', e.target.value)}
          placeholder="cth. 45210"
          error={errors.odometer_km}
        />
        <TextInput
          label="SPBU"
          value={form.station}
          onChange={(e) => set('station', e.target.value)}
          placeholder="cth. SPBU 34.123"
          error={errors.station}
        />
        <Select
          label="Jenis BBM"
          value={form.fuel_type}
          onChange={(e) => set('fuel_type', e.target.value)}
          options={FUEL_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <TextInput
          label="Nominal (Rp)"
          type="number"
          required
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="cth. 250000"
          error={errors.amount}
        />
        <TextInput
          label="No. Bukti / Nota"
          value={form.proof_reference}
          onChange={(e) => set('proof_reference', e.target.value)}
          placeholder="cth. NOTA-00123"
          error={errors.proof_reference}
        />
        <div className="sm:col-span-2">
          <TextInput
            label="Catatan"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Opsional"
          />
        </div>
      </div>
    </Modal>
  )
}
