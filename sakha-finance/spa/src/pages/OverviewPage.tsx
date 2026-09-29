import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Fuel,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Metric } from '@/components/ui/Metric'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/States'
import { useOverview } from '@/lib/hooks'
import { formatIDR, formatRelative } from '@/lib/format'
import { DOCUMENT_STATUS, metaFor, SEVERITY_META } from '@/lib/status'

/**
 * Shortcuts to the Finance tasks most often opened from Beranda. Each links to
 * a real module — no dead ends.
 */
const QUICK_ACTIONS = [
  { to: '/app/transaksi', label: 'Transaksi Baru', icon: Receipt },
  { to: '/app/pembayaran?tab=pencocokan', label: 'Pencocokan Pembayaran', icon: Wallet },
  { to: '/app/arsip', label: 'Susun Arsip', icon: Archive },
  { to: '/app/ketelitian', label: 'Periksa Ketelitian', icon: ClipboardCheck },
  { to: '/app/pengeluaran', label: 'Catat Pengeluaran', icon: Fuel },
  { to: '/app/pengadaan', label: 'Catat Pengadaan', icon: ShoppingCart },
]

/**
 * Beranda — ringkasan operasional Finance.
 *
 * The page answers one question first: "apa yang perlu diperiksa atau
 * dikerjakan sekarang?" The actionable queue sits at the top; counts and
 * activity support it. Charts deliberately live on a separate page so this
 * stays a working surface rather than a reporting surface.
 */
export function OverviewPage() {
  const { data, isLoading, error, refetch } = useOverview()
  const navigate = useNavigate()
  const [showAllAttention, setShowAllAttention] = useState(false)

  // Keep the queue short by default; the full list is one click away and the
  // count stays visible.
  const ATTENTION_PREVIEW = 5
  const attention = data?.attention ?? []
  const visibleAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_PREVIEW)
  const hiddenAttention = attention.length - ATTENTION_PREVIEW

  return (
    <div>
      <PageHeader
        title="Selamat datang kembali."
        description="Ringkasan aktivitas Finance."
        actions={
          <button
            type="button"
            onClick={() => navigate('/app/analitik')}
            className="df-btn-secondary text-xs"
          >
            <TrendingUp className="h-4 w-4" />
            Lihat Analitik
          </button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {error ? (
          <div className="df-card">
            <ErrorState message="Gagal memuat ringkasan." onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <OverviewSkeleton />
        ) : (
          <>
            {/* Metric row — the four numbers a Finance operator checks first */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric
                label="Invoice"
                value={data.metrics.invoices_total}
                sub={`${data.metrics.invoices_unpaid} belum lunas`}
                icon={<Receipt className="h-4 w-4" />}
                spark={data.trends?.invoices}
                onClick={() => navigate('/app/invoice')}
              />
              <Metric
                label="Pembayaran"
                value={data.metrics.payments_this_month}
                sub={`${data.metrics.payments_pending} menunggu konfirmasi`}
                tone={data.metrics.payments_pending > 0 ? 'warning' : 'success'}
                icon={<Wallet className="h-4 w-4" />}
                spark={data.trends?.payments}
                onClick={() => navigate('/app/pembayaran')}
              />
              <Metric
                label="Dokumen"
                value={data.metrics.documents_total}
                sub={`${data.metrics.pending_documents} menunggu ditinjau`}
                icon={<FileText className="h-4 w-4" />}
                spark={data.trends?.documents}
                onClick={() => navigate('/app/dokumen')}
              />
              <Metric
                label="Perlu Diperiksa"
                value={data.metrics.needs_review}
                sub={`${data.metrics.verification_failures} dengan temuan verifikasi`}
                tone={data.metrics.needs_review > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle className="h-4 w-4" />}
                spark={data.trends?.transactions}
                onClick={() => navigate('/app/transaksi?status=NEEDS_REVIEW')}
              />
            </div>

            {/* Aksi cepat — pintasan ke pekerjaan Finance yang paling sering dibuka */}
            <div className="df-card p-4">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-wide text-ink-400">Aksi Cepat</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.to}
                      type="button"
                      onClick={() => navigate(a.to)}
                      className="flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Perlu ditindaklanjuti: stretches to match the right column so
                  the two sides end level, and the list fills the height. */}
              <div className="df-card flex flex-col xl:col-span-2">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warn-500" aria-hidden />
                    <h2 className="text-sm font-semibold text-ink-900">Perlu Ditindaklanjuti</h2>
                  </div>
                  <span className="text-xs text-ink-400">{data.attention.length} item</span>
                </div>

                {data.attention.length === 0 ? (
                  <EmptyState
                    title="Tidak ada yang perlu ditindaklanjuti"
                    description="Tidak ada dokumen kurang, pembayaran lewat jatuh tempo, atau temuan verifikasi saat ini."
                    icon={<CheckCircle2 className="h-5 w-5 text-ok-500" />}
                  />
                ) : (
                  <>
                    <ul className="divide-y divide-ink-100">
                      {visibleAttention.map((item, index) => {
                        const sev = SEVERITY_META[item.severity] ?? SEVERITY_META.LOW
                        return (
                          <li key={`${item.type}-${item.entity_id}-${index}`}>
                            <button
                              type="button"
                              onClick={() => navigate(`/app/transaksi/${item.entity_id}`)}
                              className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-ink-50"
                            >
                              <StatusBadge label={sev.label} tone={sev.tone} dot={false} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-xs font-medium text-ink-800">{item.transaction_code}</p>
                                <p className="mt-0.5 text-xs text-ink-500">{item.message}</p>
                              </div>
                              <span className="whitespace-nowrap text-2xs text-ink-400">
                                {formatRelative(item.created_at)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>

                    {hiddenAttention > 0 || showAllAttention ? (
                      <div className="border-t border-ink-100 px-5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setShowAllAttention((v) => !v)}
                          className="text-xs font-medium text-accent-600 hover:text-accent-700"
                        >
                          {showAllAttention ? 'Tampilkan lebih sedikit' : `Lihat semua ${attention.length} item`}
                        </button>
                      </div>
                    ) : null}

                    {/* Fills the leftover height with something useful: a split
                        of the queue by severity, so an operator sees at a glance
                        how much is urgent before reading the rows. */}
                    <div className="mt-auto border-t border-ink-100 px-5 py-4">
                      <p className="mb-3 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                        Sebaran berdasarkan prioritas
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {(
                          [
                            ['Tinggi', attention.filter((a) => a.severity === 'HIGH').length, 'text-bad-600'],
                            ['Sedang', attention.filter((a) => a.severity === 'MEDIUM').length, 'text-warn-600'],
                            ['Rendah', attention.filter((a) => a.severity === 'LOW').length, 'text-ink-600'],
                          ] as const
                        ).map(([label, count, tone]) => (
                          <div key={label} className="rounded-md border border-ink-100 bg-ink-50/60 px-3 py-2.5">
                            <p className={`text-lg font-semibold tabular-nums ${tone}`}>{count}</p>
                            <p className="mt-0.5 text-2xs text-ink-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Status dokumen + ringkasan operasional */}
              <div className="space-y-6">
                <div className="df-card">
                  <div className="border-b border-ink-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-ink-900">Status Dokumen</h2>
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {Object.entries(data.document_status_breakdown ?? {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => {
                        const meta = metaFor(DOCUMENT_STATUS, status)
                        return (
                          <li key={status} className="flex items-center justify-between px-5 py-2.5">
                            <StatusBadge label={meta.label} tone={meta.tone} />
                            <span className="text-sm font-medium tabular-nums text-ink-700">{count}</span>
                          </li>
                        )
                      })}
                  </ul>
                </div>

                <div className="df-card">
                  <div className="border-b border-ink-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-ink-900">Ringkasan Operasional</h2>
                  </div>
                  <dl className="divide-y divide-ink-100 text-sm">
                    <SummaryRow
                      icon={<BadgeCheck className="h-4 w-4 text-ink-400" />}
                      label="Transaksi selesai"
                      value={data.metrics.completed_transactions}
                    />
                    <SummaryRow
                      icon={<Archive className="h-4 w-4 text-ink-400" />}
                      label="Dokumen diarsipkan"
                      value={data.metrics.documents_archived}
                    />
                    <SummaryRow
                      icon={<Truck className="h-4 w-4 text-ink-400" />}
                      label="Pengiriman aktif"
                      value={data.metrics.active_deliveries}
                    />
                    <SummaryRow
                      icon={<Clock className="h-4 w-4 text-ink-400" />}
                      label="Pengiriman terlambat"
                      value={data.metrics.delayed_deliveries}
                      danger={data.metrics.delayed_deliveries > 0}
                    />
                    <SummaryRow
                      icon={<Wallet className="h-4 w-4 text-ink-400" />}
                      label="Nilai jatuh tempo"
                      value={formatIDR(data.metrics.overdue_invoices_amount)}
                      danger={data.metrics.overdue_invoices > 0}
                    />
                  </dl>
                </div>

                {/* Pengiriman & kelengkapan resi — pandangan Finance */}
                <div className="df-card">
                  <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-ink-900">Pengiriman &amp; Resi</h2>
                    <button
                      type="button"
                      onClick={() => navigate('/app/pengiriman')}
                      className="text-xs font-medium text-accent-600 hover:text-accent-700"
                    >
                      Lihat
                    </button>
                  </div>
                  <dl className="divide-y divide-ink-100 text-sm">
                    <SummaryRow
                      icon={<Truck className="h-4 w-4 text-ink-400" />}
                      label="Total pengiriman"
                      value={data.metrics.deliveries_total}
                    />
                    <SummaryRow
                      icon={<FileText className="h-4 w-4 text-ink-400" />}
                      label="Belum ada resi"
                      value={data.metrics.deliveries_missing_receipt}
                      danger={data.metrics.deliveries_missing_receipt > 0}
                    />
                    <SummaryRow
                      icon={<ClipboardCheck className="h-4 w-4 text-ink-400" />}
                      label="Belum ada tanda terima"
                      value={data.metrics.deliveries_missing_handover}
                      danger={data.metrics.deliveries_missing_handover > 0}
                    />
                    <SummaryRow
                      icon={<Clock className="h-4 w-4 text-ink-400" />}
                      label="Terkirim belum diarsipkan"
                      value={data.metrics.deliveries_delivered_unfiled}
                      danger={data.metrics.deliveries_delivered_unfiled > 0}
                    />
                  </dl>
                </div>
              </div>
            </div>

            {/* Aktivitas terbaru */}
            <div className="df-card">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-ink-900">Aktivitas Terbaru</h2>
                <button
                  type="button"
                  onClick={() => navigate('/app/aktivitas')}
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  Lihat semua
                </button>
              </div>
              {data.recent_activity.length === 0 ? (
                <EmptyState title="Belum ada aktivitas" description="Tindakan pada sistem akan tampil di sini." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {data.recent_activity.map((log) => (
                    <li key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-2xs font-semibold text-ink-500">
                        {(log.user_name ?? 'S').charAt(0).toUpperCase()}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs text-ink-600">
                        <span className="font-medium text-ink-800">{log.user_name}</span> · {log.description}
                      </p>
                      <span className="whitespace-nowrap text-2xs text-ink-400">{formatRelative(log.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className="flex items-center gap-2 text-xs text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className={`text-sm font-medium tabular-nums ${danger ? 'text-bad-600' : 'text-ink-800'}`}>{value}</dd>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-36" />
        </div>
      </div>
      <Skeleton className="h-56" />
    </div>
  )
}
