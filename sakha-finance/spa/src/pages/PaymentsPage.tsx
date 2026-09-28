import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { ConfirmDialog } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { usePayments, usePaymentAction, usePaymentMatching, type PaymentMatchRow } from '@/lib/hooks'
import { ReadOnlyBanner } from '@/components/RoleBadge'
import { formatDate, formatIDR } from '@/lib/format'
import { PAYMENT_METHODS, PAYMENT_STATUS, metaFor } from '@/lib/status'
import { useToast } from '@/lib/toast'
import { ApiError } from '@/lib/api'
import type { Payment, Tone } from '@/types/api'

type Tab = 'pembayaran' | 'pencocokan'


export function PaymentsPage() {
  return (
    <div>
      <PageHeader title="Pembayaran" description="Semua pembayaran yang tercatat pada transaksi, termasuk pembayaran sebagian." />
      <PaymentsTabs />
    </div>
  )
}

/** Tab switcher between the payment list and the invoice-vs-payment matching view. */
function PaymentsTabs() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'pembayaran'

  function switchTab(next: Tab) {
    const p = new URLSearchParams(params)
    if (next === 'pembayaran') p.delete('tab')
    else p.set('tab', next)
    p.delete('page')
    setParams(p, { replace: true })
  }

  return (
    <div>
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="flex gap-1" aria-label="Bagian pembayaran">
          {([
            ['pembayaran', 'Pembayaran'],
            ['pencocokan', 'Pencocokan'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={clsx(
                '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-accent-600 text-accent-700'
                  : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'pencocokan' ? <MatchingView /> : <PaymentsList />}
    </div>
  )
}

function PaymentsList() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const action = usePaymentAction()
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null)

  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    method: params.get('method') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 15,
  }
  const { data, isLoading, error, refetch } = usePayments(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const act = async (id: number, act: 'confirm' | 'reject', reason?: string) => {
    try {
      await action.mutateAsync({ id, action: act, reason })
      toast.success(`Pembayaran ${act === 'confirm' ? 'dikonfirmasi' : 'ditolak'}`)
      setRejectTarget(null)
    } catch (err) {
      toast.error('Tidak dapat memperbarui pembayaran', err instanceof ApiError ? err.message : undefined)
    }
  }

  const columns: Column<Payment>[] = [
    {
      key: 'reference',
      header: 'Referensi',
      render: (p) => (
        <div>
          <p className="font-mono text-xs font-medium text-ink-800">{p.payment_reference ?? `PAY-${p.id}`}</p>
          <p className="text-2xs text-ink-400">{formatDate(p.payment_date)}</p>
        </div>
      ),
    },
    {
      key: 'transaction',
      header: 'Transaksi',
      render: (p) => <span className="font-mono text-2xs text-ink-500">{p.transaction?.transaction_code ?? '—'}</span>,
    },
    { key: 'customer', header: 'Pelanggan', render: (p) => <span className="text-xs text-ink-600">{p.transaction?.customer?.name ?? '—'}</span> },
    { key: 'method', header: 'Metode', render: (p) => <span className="text-xs text-ink-600">{p.method_label}</span> },
    { key: 'amount', header: 'Nominal', align: 'right', render: (p) => <span className="font-medium tabular-nums text-ink-800">{formatIDR(p.amount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const meta = metaFor(PAYMENT_STATUS, p.status)
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) =>
        p.status === 'PENDING' ? (
          <div className="flex justify-end gap-1.5" data-row-click-stop>
            <Button variant="secondary" className="px-2 py-1 text-2xs" onClick={() => act(p.id, 'confirm')}>
              Konfirmasi
            </Button>
            <Button variant="danger" className="px-2 py-1 text-2xs" onClick={() => setRejectTarget(p)}>
              Tolak
            </Button>
          </div>
        ) : (
          <span className="text-2xs text-ink-300" aria-hidden>
            &mdash;
          </span>
        ),
    },
  ]

  return (
    <>
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Cari referensi, transaksi…" className="w-full sm:w-64" />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => update('status', v)} placeholder="Semua status" options={Object.entries(PAYMENT_STATUS).map(([value, m]) => ({ value, label: m.label }))} />
        <FilterSelect label="Metode" value={filters.method} onChange={(v) => update('method', v)} placeholder="Semua metode" options={PAYMENT_METHODS} />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <ReadOnlyBanner className="mb-4" />
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Tidak dapat memuat pembayaran.' : null}
            onRetry={() => refetch()}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/app/transaksi/${p.transaction_id}`)}
            emptyTitle="Tidak ada pembayaran tercatat"
            emptyDescription="Pembayaran yang tercatat pada transaksi akan muncul di sini."
            pagination={
              data?.meta
                ? { page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total, onPageChange: (p) => update('page', String(p)) }
                : undefined
            }
          />
        </div>
      </div>
      <ConfirmDialog
        open={rejectTarget !== null}
        title="Tolak pembayaran"
        message="Tolak pembayaran ini? Pembayaran tidak akan lagi dihitung dalam saldo terselesaikan."
        confirmLabel="Tolak"
        danger
        loading={action.isPending}
        onConfirm={() => rejectTarget && act(rejectTarget.id, 'reject')}
        onCancel={() => setRejectTarget(null)}
      />
    </>
  )
}

/* ------------------------------------------------------ Pencocokan ------- */

const MATCH_META: Record<string, { label: string; tone: Tone }> = {
  SESUAI: { label: 'Sesuai', tone: 'success' },
  PERLU_DIPERIKSA: { label: 'Perlu Diperiksa', tone: 'warning' },
  TIDAK_SESUAI: { label: 'Tidak Sesuai', tone: 'danger' },
}

/**
 * Pencocokan Pembayaran — compares the invoice value against confirmed
 * payments and states the rupiah difference explicitly, so a mismatch is
 * visible as an amount rather than only as a status.
 */
function MatchingView() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const filters = {
    search: params.get('ms') ?? '',
    result: params.get('mresult') ?? '',
    page: Number(params.get('mpage') ?? 1),
  }
  const { data, isLoading, error, refetch } = usePaymentMatching({
    search: filters.search || undefined,
    result: filters.result || undefined,
    page: filters.page,
  })

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('mpage')
    setParams(next, { replace: true })
  }

  const rows = data?.data ?? []

  const columns: Column<PaymentMatchRow>[] = [
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
    { key: 'invoiced', header: 'Nilai Invoice', align: 'right', render: (r) => <span className="tabular-nums text-ink-700">{formatIDR(r.invoiced)}</span> },
    { key: 'paid', header: 'Nilai Pembayaran', align: 'right', render: (r) => <span className="tabular-nums text-ink-700">{formatIDR(r.paid)}</span> },
    {
      key: 'difference',
      header: 'Selisih',
      align: 'right',
      render: (r) => (
        <span className={clsx('tabular-nums font-medium', r.difference === '0.00' ? 'text-ink-500' : 'text-warn-600')}>
          {r.difference_label}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Hasil',
      render: (r) => {
        const meta = MATCH_META[r.status] ?? { label: r.status, tone: 'neutral' as Tone }
        return <StatusBadge label={meta.label} tone={meta.tone} />
      },
    },
  ]

  return (
    <>
      <FilterBar>
        <SearchInput value={filters.search} onChange={(v) => update('ms', v)} placeholder="Cari transaksi atau pelanggan…" className="w-full sm:w-64" />
        <FilterSelect
          label="Hasil pencocokan"
          value={filters.result}
          onChange={(v) => update('mresult', v)}
          placeholder="Semua hasil"
          options={[
            { value: 'SESUAI', label: 'Sesuai' },
            { value: 'PERLU_DIPERIKSA', label: 'Perlu Diperiksa' },
            { value: 'TIDAK_SESUAI', label: 'Tidak Sesuai' },
          ]}
        />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card mb-4 flex items-start gap-3 p-4">
          <p className="text-xs leading-relaxed text-ink-600">
            Pencocokan membandingkan nilai invoice dengan total pembayaran terkonfirmasi. Jika terdapat perbedaan,
            sistem menampilkan nominal selisihnya dan menandai baris sebagai <strong>Perlu Diperiksa</strong>.
          </p>
        </div>
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            error={error ? 'Tidak dapat memuat pencocokan pembayaran.' : null}
            onRetry={() => refetch()}
            rowKey={(r) => r.transaction_id}
            onRowClick={(r) => navigate(`/app/transaksi/${r.transaction_id}`)}
            emptyTitle="Tidak ada data untuk dicocokkan"
            emptyDescription="Transaksi yang memiliki invoice akan tampil di sini."
            pagination={
              data?.meta
                ? {
                    page: data.meta.current_page,
                    lastPage: data.meta.last_page,
                    total: data.meta.total,
                    onPageChange: (p) => {
                      const next = new URLSearchParams(params)
                      next.set('mpage', String(p))
                      setParams(next, { replace: true })
                    },
                  }
                : undefined
            }
          />
        </div>
      </div>
    </>
  )
}
