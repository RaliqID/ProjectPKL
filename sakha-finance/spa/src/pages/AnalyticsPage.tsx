import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import {
  AreaChart,
  ChartCard,
  GroupedBarChart,
  RankedBarList,
  StackedBarChart,
  TrendStat,
} from '@/components/ui/Charts'
import { useAnalytics } from '@/lib/hooks'
import { formatIDR, formatNumber } from '@/lib/format'
import { metaFor, TRANSACTION_STATUS } from '@/lib/status'
import type { AnalyticsData, Tone } from '@/types/api'

/**
 * Analitik — a per-module analytics workspace.
 *
 * Each tab answers "how is this module trending" for one area of the Finance
 * workflow, so the page is a set of focused analytical views rather than one
 * crowded dashboard. All series come from stored records (AnalyticsService).
 */

/** Palette mirrors the Tailwind status tokens so charts match badges. */
const PALETTE = {
  accent: '#8f1d24',
  accentFill: '#f6e2e3',
  ok: '#12b76a',
  warn: '#f79009',
  bad: '#f04438',
  info: '#2e90fa',
  ink: '#a8a29a',
}

/** "2026-05" -> "Mei" */
function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('id-ID', { month: 'short' })
}

type Window = 3 | 6 | 12

type TabKey = 'ringkasan' | 'invoice' | 'dokumen' | 'operasional' | 'pengeluaran'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'invoice', label: 'Invoice & Pembayaran' },
  { key: 'dokumen', label: 'Dokumen & Arsip' },
  { key: 'operasional', label: 'Verifikasi & Ketelitian' },
  { key: 'pengeluaran', label: 'Pengeluaran & Pengadaan' },
]

export function AnalyticsPage() {
  const [months, setMonths] = useState<Window>(6)
  const [tab, setTab] = useState<TabKey>('ringkasan')
  const { data, isLoading, error, refetch } = useAnalytics(months)

  return (
    <div>
      <PageHeader
        title="Analitik"
        description="Analisis per modul: tren bulanan invoice, pembayaran, dokumen, arsip, verifikasi, ketelitian, pengeluaran, dan pengadaan — setiap angka berasal dari data tersimpan."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-ink-200 bg-white p-0.5">
            {([3, 6, 12] as Window[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={clsx(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  months === m ? 'bg-accent-600 text-white' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
                )}
              >
                {m} Bln
              </button>
            ))}
          </div>
        }
      />

      {/* Tab bar */}
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="flex flex-wrap gap-1" aria-label="Bagian analitik">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-accent-600 text-accent-700'
                  : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6 p-6 lg:p-8">
        {error ? (
          <div className="df-card">
            <ErrorState message="Gagal memuat analitik." onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <AnalyticsSkeleton />
        ) : (
          <AnalyticsTab tab={tab} data={data} />
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ tab, data }: { tab: TabKey; data: AnalyticsData }) {
  const labels = data.months.map(monthLabel)

  switch (tab) {
    case 'invoice':
      return <InvoiceAnalytics data={data} labels={labels} />
    case 'dokumen':
      return <DocumentAnalytics data={data} labels={labels} />
    case 'operasional':
      return <OperationsAnalytics data={data} labels={labels} />
    case 'pengeluaran':
      return <SpendAnalytics data={data} labels={labels} />
    default:
      return <SummaryAnalytics data={data} labels={labels} />
  }
}

/* ------------------------------------------------------- Ringkasan ------- */

function SummaryAnalytics({ data, labels }: { data: AnalyticsData; labels: string[] }) {
  const txThisMonth = last(data.transactions.total)
  const txPrevMonth = nth(data.transactions.total, -2)
  const txDelta = pctChange(txPrevMonth, txThisMonth)

  const revThisMonth = last(data.revenue.paid)
  const revPrevMonth = nth(data.revenue.paid, -2)
  const revDelta = pctChange(revPrevMonth, revThisMonth)

  const statusItems = Object.entries(data.status_breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => {
      const meta = metaFor(TRANSACTION_STATUS, status)
      return { label: meta.label, value: count, color: toneToColor(meta.tone) }
    })

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStat label="Transaksi (bulan ini)" value={formatNumber(txThisMonth)} delta={txDelta} deltaLabel={deltaText(txDelta, txPrevMonth)} tone={toneFor(txDelta)} />
        <TrendStat label="Pendapatan terkonfirmasi" value={formatIDR(revThisMonth)} delta={revDelta} deltaLabel={deltaText(revDelta, revPrevMonth)} tone={toneFor(revDelta)} />
        <TrendStat label="Tingkat pencocokan" value={`${data.matching.match_rate}%`} deltaLabel={`${data.matching.sesuai} dari ${data.matching.total} transaksi sesuai`} tone={data.matching.match_rate >= 80 ? 'up' : 'neutral'} />
        <TrendStat label="Tingkat ketelitian" value={`${data.accuracy.accuracy_rate}%`} deltaLabel={`${data.accuracy.sesuai} transaksi sesuai pemeriksaan`} tone={data.accuracy.accuracy_rate >= 80 ? 'up' : 'neutral'} />
      </div>

      <ChartCard title="Tren pendapatan terkonfirmasi" subtitle="Nilai pembayaran terkonfirmasi yang diterima setiap bulan" footer={`Total terkonfirmasi: ${formatIDR(data.revenue.total_paid)} · Total invoice: ${formatIDR(data.revenue.total_invoiced)}`}>
        <AreaChart data={data.revenue.paid.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.accent} fill={PALETTE.accentFill} formatValue={formatIDR} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Volume transaksi" subtitle="Selesai vs ditandai untuk ditinjau, per bulan" footer={`${data.transactions.grand_total} transaksi · ${data.transactions.grand_completed} selesai`}>
          <GroupedBarChart categories={labels} series={[{ name: 'Selesai', color: PALETTE.ok, values: data.transactions.completed }, { name: 'Perlu diperiksa', color: PALETTE.bad, values: data.transactions.needs_review }]} formatValue={formatNumber} />
        </ChartCard>
        <ChartCard title="Transaksi menurut status" subtitle="Distribusi saat ini">
          <RankedBarList items={statusItems} formatValue={formatNumber} />
        </ChartCard>
      </div>

      <ChartCard title="Ringkasan hasil pemeriksaan" subtitle="Pencocokan pembayaran & ketelitian data (kondisi saat ini)" footer="Diperbarui mengikuti data terbaru.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ShareBar title="Pencocokan pembayaran" total={data.matching.total} segments={[
            { label: 'Sesuai', value: data.matching.sesuai, color: PALETTE.ok },
            { label: 'Perlu Diperiksa', value: data.matching.perlu_diperiksa, color: PALETTE.warn },
            { label: 'Tidak Sesuai', value: data.matching.tidak_sesuai, color: PALETTE.bad },
          ]} />
          <ShareBar title="Pemeriksaan ketelitian" total={data.accuracy.total} segments={[
            { label: 'Sesuai', value: data.accuracy.sesuai, color: PALETTE.ok },
            { label: 'Perlu Diperiksa', value: data.accuracy.perlu_diperiksa, color: PALETTE.warn },
            { label: 'Tidak Sesuai', value: data.accuracy.tidak_sesuai, color: PALETTE.bad },
          ]} />
        </div>
      </ChartCard>
    </>
  )
}

/* ------------------------------------------------ Invoice & Pembayaran -- */

function InvoiceAnalytics({ data, labels }: { data: AnalyticsData; labels: string[] }) {
  const matchSegments = [
    { label: 'Sesuai', value: data.matching.sesuai, color: PALETTE.ok },
    { label: 'Perlu Diperiksa', value: data.matching.perlu_diperiksa, color: PALETTE.warn },
    { label: 'Tidak Sesuai', value: data.matching.tidak_sesuai, color: PALETTE.bad },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStat label="Total invoice" value={formatNumber(data.invoices.total)} deltaLabel={formatIDR(data.invoices.total_value)} />
        <TrendStat label="Invoice jatuh tempo" value={formatNumber(data.invoices.overdue_current)} deltaLabel="melewati tanggal jatuh tempo" tone={data.invoices.overdue_current > 0 ? 'down' : 'neutral'} />
        <TrendStat label="Pembayaran terkonfirmasi" value={formatIDR(data.payments.total_confirmed)} deltaLabel={`${data.payments.total} pembayaran tercatat`} />
        <TrendStat label="Tingkat pencocokan" value={`${data.matching.match_rate}%`} deltaLabel={`selisih total ${formatIDR(data.matching.difference_total)}`} tone={data.matching.match_rate >= 80 ? 'up' : 'neutral'} />
      </div>

      <ChartCard title="Invoice diterbitkan vs lunas" subtitle="Jumlah invoice per bulan dan berapa yang lunas" footer={`${data.invoices.total} invoice pada periode ini`}>
        <GroupedBarChart categories={labels} series={[
          { name: 'Diterbitkan', color: PALETTE.info, values: data.invoices.issued },
          { name: 'Lunas', color: PALETTE.ok, values: data.invoices.paid },
          { name: 'Jatuh tempo', color: PALETTE.bad, values: data.invoices.overdue },
        ]} formatValue={formatNumber} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Nilai invoice per bulan" subtitle="Total nilai invoice yang diterbitkan" footer={`Total: ${formatIDR(data.invoices.total_value)}`}>
          <AreaChart data={data.invoices.value.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.info} fill="#d1e9ff" formatValue={formatIDR} />
        </ChartCard>
        <ChartCard title="Nilai pembayaran terkonfirmasi" subtitle="Total pembayaran terkonfirmasi per bulan" footer={`Total: ${formatIDR(data.payments.total_confirmed)}`}>
          <AreaChart data={data.payments.value.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.ok} fill="#d1fae0" formatValue={formatIDR} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Volume pembayaran" subtitle="Tercatat vs terkonfirmasi vs menunggu, per bulan" footer={`${data.payments.total} pembayaran tercatat`}>
          <GroupedBarChart categories={labels} series={[
            { name: 'Tercatat', color: PALETTE.accent, values: data.payments.recorded },
            { name: 'Terkonfirmasi', color: PALETTE.ok, values: data.payments.confirmed },
            { name: 'Menunggu', color: PALETTE.warn, values: data.payments.pending },
          ]} formatValue={formatNumber} />
        </ChartCard>
        <ChartCard title="Hasil pencocokan pembayaran" subtitle="Invoice vs pembayaran (kondisi saat ini)" footer={`Selisih total: ${formatIDR(data.matching.difference_total)}`}>
          <ShareBar title="Pencocokan" total={data.matching.total} segments={matchSegments} />
        </ChartCard>
      </div>
    </>
  )
}

/* --------------------------------------------------- Dokumen & Arsip ---- */

function DocumentAnalytics({ data, labels }: { data: AnalyticsData; labels: string[] }) {
  const typeItems = data.archives.by_type.slice(0, 8).map((t) => ({
    label: t.label,
    value: t.total,
    color: PALETTE.accent,
  }))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStat label="Dokumen diunggah" value={formatNumber(data.documents.total)} deltaLabel="pada periode ini" />
        <TrendStat label="Dokumen terverifikasi" value={formatNumber(sum(data.documents.verified))} deltaLabel={`${pctChange(sum(data.documents.uploaded), sum(data.documents.verified))}% dari yang diunggah`} />
        <TrendStat label="Total arsip" value={formatNumber(data.archives.total)} deltaLabel={`${data.archives.by_type.length} jenis dokumen`} />
        <TrendStat label="Dokumen diarsipkan (bulan ini)" value={formatNumber(last(data.archives.filed))} deltaLabel="dokumen masuk arsip" />
      </div>

      <ChartCard title="Volume dokumen" subtitle="Diunggah vs diverifikasi, per bulan" footer={`${data.documents.total} dokumen diunggah pada periode ini`}>
        <GroupedBarChart categories={labels} series={[
          { name: 'Diunggah', color: PALETTE.info, values: data.documents.uploaded },
          { name: 'Terverifikasi', color: PALETTE.ok, values: data.documents.verified },
        ]} formatValue={formatNumber} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Dokumen masuk arsip" subtitle="Jumlah dokumen yang diarsipkan per bulan" footer={`${data.archives.total} dokumen di arsip`}>
          <AreaChart data={data.archives.filed.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.accent} fill={PALETTE.accentFill} formatValue={formatNumber} />
        </ChartCard>
        <ChartCard title="Arsip menurut jenis dokumen" subtitle="Distribusi jenis dokumen di arsip">
          {typeItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-400">Belum ada dokumen di arsip.</p>
          ) : (
            <RankedBarList items={typeItems} formatValue={formatNumber} />
          )}
        </ChartCard>
      </div>
    </>
  )
}

/* ---------------------------------------- Verifikasi & Ketelitian ------- */

function OperationsAnalytics({ data, labels }: { data: AnalyticsData; labels: string[] }) {
  const accuracySegments = [
    { label: 'Sesuai', value: data.accuracy.sesuai, color: PALETTE.ok },
    { label: 'Perlu Diperiksa', value: data.accuracy.perlu_diperiksa, color: PALETTE.warn },
    { label: 'Tidak Sesuai', value: data.accuracy.tidak_sesuai, color: PALETTE.bad },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStat label="Tingkat kesesuaian verifikasi" value={`${data.verification.overall_pass_rate}%`} deltaLabel={`${data.verification.total_runs} pemeriksaan`} tone={data.verification.overall_pass_rate >= 80 ? 'up' : 'neutral'} />
        <TrendStat label="Skor verifikasi" value={`${last(data.verification.average_score)}%`} deltaLabel="rata-rata bulan ini" />
        <TrendStat label="Tingkat ketelitian" value={`${data.accuracy.accuracy_rate}%`} deltaLabel={`${data.accuracy.total} transaksi diperiksa`} tone={data.accuracy.accuracy_rate >= 80 ? 'up' : 'neutral'} />
        <TrendStat label="Temuan pemeriksaan" value={formatNumber(data.accuracy.tidak_sesuai + data.accuracy.perlu_diperiksa)} deltaLabel="perlu ditindaklanjuti" tone={data.accuracy.tidak_sesuai > 0 ? 'down' : 'neutral'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Hasil verifikasi" subtitle="Sesuai, perlu diperiksa, dan tidak sesuai, per bulan" footer={`${data.verification.total_runs} pemeriksaan · tingkat sesuai ${data.verification.overall_pass_rate}%`}>
          <StackedBarChart categories={labels} series={[
            { name: 'Sesuai', color: PALETTE.ok, values: data.verification.passed },
            { name: 'Perlu diperiksa', color: PALETTE.warn, values: data.verification.warning },
            { name: 'Tidak sesuai', color: PALETTE.bad, values: data.verification.failed },
          ]} formatValue={formatNumber} />
        </ChartCard>
        <ChartCard title="Skor kualitas verifikasi" subtitle="Rata-rata skor aturan setiap bulan (0–100)" footer="Skor 100 berarti semua aturan sesuai; perlu diperiksa dihitung setengah.">
          <AreaChart data={data.verification.average_score.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.ok} fill="#d1fae0" formatValue={(v) => `${v}%`} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Distribusi pemeriksaan ketelitian" subtitle="Hasil per transaksi (kondisi saat ini)" footer={`${data.accuracy.total} transaksi diperiksa`}>
          <ShareBar title="Ketelitian" total={data.accuracy.total} segments={accuracySegments} />
        </ChartCard>
        <ChartCard title="Jumlah pemeriksaan per kriteria" subtitle="Total temuan & kesesuaian per kriteria pemeriksaan">
          <RankedBarList
            items={[
              { label: 'Sesuai', value: data.accuracy.check_totals.sesuai, color: PALETTE.ok },
              { label: 'Perlu Diperiksa', value: data.accuracy.check_totals.perlu_diperiksa, color: PALETTE.warn },
              { label: 'Tidak Sesuai', value: data.accuracy.check_totals.tidak_sesuai, color: PALETTE.bad },
            ]}
            formatValue={formatNumber}
          />
        </ChartCard>
      </div>
    </>
  )
}

/* ------------------------------------------ Pengeluaran & Pengadaan ----- */

function SpendAnalytics({ data, labels }: { data: AnalyticsData; labels: string[] }) {
  const spendTotal = data.expenses.total_amount + data.procurements.total_value

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStat label="Total pengeluaran" value={formatIDR(data.expenses.total_amount)} deltaLabel={`${data.expenses.total} catatan`} />
        <TrendStat label="Total pengadaan" value={formatIDR(data.procurements.total_value)} deltaLabel={`${data.procurements.total} catatan`} />
        <TrendStat label="Pengeluaran disetujui" value={formatNumber(data.expenses.approved)} deltaLabel="klaim disetujui/dibayar" tone="up" />
        <TrendStat label="Total belanja operasional" value={formatIDR(spendTotal)} deltaLabel="pengeluaran + pengadaan" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Pengeluaran per bulan" subtitle="Bensin (BBM) vs pengeluaran lain, nilai rupiah" footer={`Total: ${formatIDR(data.expenses.total_amount)}`}>
          <GroupedBarChart categories={labels} series={[
            { name: 'Bensin (BBM)', color: PALETTE.warn, values: data.expenses.fuel_amount },
            { name: 'Lainnya', color: PALETTE.info, values: data.expenses.other_amount },
          ]} formatValue={formatIDR} />
        </ChartCard>
        <ChartCard title="Nilai pengadaan per bulan" subtitle="Total nilai pengadaan barang" footer={`Total: ${formatIDR(data.procurements.total_value)}`}>
          <AreaChart data={data.procurements.value.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.accent} fill={PALETTE.accentFill} formatValue={formatIDR} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Jumlah pengeluaran per bulan" subtitle="Banyaknya catatan pengeluaran" footer={`${data.expenses.total} catatan pengeluaran`}>
          <AreaChart data={data.expenses.count.map((value, i) => ({ label: labels[i], value }))} color={PALETTE.warn} fill="#fef0c7" formatValue={formatNumber} />
        </ChartCard>
        <ChartCard title="Status pengadaan" subtitle="Distribusi status pengadaan saat ini">
          <RankedBarList
            items={Object.entries(data.procurements.by_status)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => ({
                label: procurementStatusLabel(status),
                value: count,
                color: procurementStatusColor(status),
              }))}
            formatValue={formatNumber}
          />
        </ChartCard>
      </div>
    </>
  )
}

/* ------------------------------------------------------------ helpers --- */

function procurementStatusLabel(status: string): string {
  return (
    {
      REQUESTED: 'Diminta',
      ORDERED: 'Dipesan',
      SHIPPED: 'Dikirim',
      RECEIVED: 'Diterima',
      CANCELLED: 'Dibatalkan',
    }[status] ?? status
  )
}

function procurementStatusColor(status: string): string {
  return (
    {
      REQUESTED: PALETTE.ink,
      ORDERED: PALETTE.info,
      SHIPPED: PALETTE.info,
      RECEIVED: PALETTE.ok,
      CANCELLED: PALETTE.ink,
    }[status] ?? PALETTE.ink
  )
}

/** Horizontal part-to-whole bar with a legend. Used for snapshot breakdowns. */
function ShareBar({
  title,
  total,
  segments,
}: {
  title: string
  total: number
  segments: { label: string; value: number; color: string }[]
}) {
  const safeTotal = total > 0 ? total : 1

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-700">{title}</span>
        <span className="text-2xs text-ink-400">{total} catatan</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-100">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full transition-all"
            style={{ width: `${(s.value / safeTotal) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-ink-600">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </span>
            <span className="font-medium tabular-nums text-ink-800">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function last(values: number[]): number {
  return values.length ? values[values.length - 1] : 0
}

/** nth from the end: nth(arr, -2) === second-to-last. */
function nth(values: number[], index: number): number {
  return values.length >= Math.abs(index) ? values[values.length + index] : 0
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function pctChange(prev: number, next: number): number {
  if (prev === 0) return next === 0 ? 0 : 100
  return Math.round(((next - prev) / prev) * 100)
}

function deltaText(delta: number, prev: number): string {
  if (prev === 0 && delta === 0) return 'tanpa perubahan vs bulan lalu'
  return `${delta >= 0 ? '+' : ''}${delta}% vs bulan lalu`
}

function toneFor(delta: number, positiveIsGood = true): 'neutral' | 'up' | 'down' {
  if (delta === 0) return 'neutral'
  const good = positiveIsGood ? delta > 0 : delta < 0
  return good ? 'up' : 'down'
}

function toneToColor(tone: Tone | undefined): string {
  switch (tone) {
    case 'success':
      return PALETTE.ok
    case 'warning':
      return PALETTE.warn
    case 'danger':
      return PALETTE.bad
    case 'info':
      return PALETTE.info
    default:
      return PALETTE.accent
  }
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
