import { useId } from 'react'

/**
 * Small, dependency-free SVG charts.
 *
 * A charting library (recharts/chart.js) would add 100kB+ to the bundle for
 * four chart shapes. These primitives share one coordinate system and render
 * server-computable data, so the bundle stays small and the visuals stay
 * consistent with the rest of the design system's colour tokens.
 *
 * All charts are responsive via viewBox and read the palette from Tailwind
 * classes passed by the caller, so a colour change flows from one place.
 */

export interface SeriesPoint {
  label: string
  value: number
}

interface ChartFrameProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Shared card chrome so every chart reads as part of the same family. */
export function ChartCard({ title, subtitle, children, footer }: ChartFrameProps) {
  return (
    <div className="df-card">
      <div className="border-b border-ink-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-2xs text-ink-400">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
      {footer ? <div className="border-t border-ink-100 px-5 py-2.5 text-2xs text-ink-400">{footer}</div> : null}
    </div>
  )
}

/** Shared SVG frame: every chart draws in the same responsive, scaled viewBox. */
function ChartSvg({
  height,
  label,
  width = 100,
  className = 'w-full',
  children,
}: {
  height: number
  label: string
  width?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: '100%' }}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  )
}

/**
 * A filled area + line chart, for a single measure over time (e.g. revenue).
 */
export function AreaChart({
  data,
  color = '#4a5cc4',
  fill = '#eef1fb',
  height = 200,
  formatValue = (v: number) => String(v),
}: {
  data: SeriesPoint[]
  color?: string
  fill?: string
  height?: number
  formatValue?: (v: number) => string
}) {
  const gradientId = useId()
  const width = 100 // viewBox units; scales via preserveAspectRatio="none"
  const pad = 6

  if (data.length === 0) return <ChartEmpty />

  const max = Math.max(...data.map((d) => d.value), 1)
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = pad + i * step
    // Invert y: SVG origin is top-left.
    const y = height - pad - (d.value / max) * (height - pad * 2)
    return { x, y, ...d }
  })

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${height - pad} L ${points[0].x.toFixed(2)} ${height - pad} Z`

  return (
    <div>
      <ChartSvg height={height} label="Trend chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="0.7"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </ChartSvg>
      <AxisLabels data={data} />
      <div className="mt-2 flex justify-between text-2xs text-ink-400">
        <span>peak {formatValue(max)}</span>
        <span>latest {formatValue(data[data.length - 1]?.value ?? 0)}</span>
      </div>
    </div>
  )
}

interface BarSeries {
  name: string
  color: string
  values: number[]
}

interface BarChartProps {
  categories: string[]
  series: BarSeries[]
  height?: number
  formatValue?: (v: number) => string
}

/**
 * Shared frame for the two bar charts: the empty guard, the responsive SVG, and
 * the axis + legend beneath it. Each chart only supplies the bars themselves.
 */
function BarChartShell({
  categories,
  series,
  height,
  formatValue,
  label,
  children,
}: BarChartProps & { label: string; children: React.ReactNode }) {
  if (categories.length === 0) return <ChartEmpty />

  return (
    <div>
      <ChartSvg height={height ?? 200} label={label}>
        {children}
      </ChartSvg>
      <AxisLabels labels={categories} />
      <Legend series={series} formatValue={formatValue ?? ((v) => String(v))} />
    </div>
  )
}

/**
 * Grouped vertical bars, for comparing 2–3 measures per period
 * (e.g. completed vs needs-review transactions, or uploaded vs verified docs).
 */
export function GroupedBarChart({ categories, series, height = 200, formatValue = (v) => String(v) }: BarChartProps) {
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  const groupWidth = 100 / categories.length
  const barGap = 1.5
  const barWidth = (groupWidth - barGap * (series.length + 1)) / series.length

  return (
    <BarChartShell
      categories={categories}
      series={series}
      height={height}
      formatValue={formatValue}
      label="Comparison chart"
    >
      {categories.map((_, ci) => {
        const groupX = ci * groupWidth
        return series.map((s, si) => {
          const v = s.values[ci] ?? 0
          const barH = (v / max) * (height - 8)
          const x = groupX + barGap * (si + 1) + barWidth * si
          const y = height - barH
          return <rect key={`${ci}-${si}`} x={x} y={y} width={barWidth} height={barH} fill={s.color} rx="0.6" />
        })
      })}
    </BarChartShell>
  )
}

/**
 * Stacked bars for a part-to-whole breakdown per period
 * (e.g. verification pass / warning / failed).
 */
export function StackedBarChart({ categories, series, height = 200, formatValue = (v) => String(v) }: BarChartProps) {
  const totals = categories.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
  const max = Math.max(...totals, 1)
  const groupWidth = 100 / categories.length
  const barWidth = groupWidth * 0.5

  return (
    <BarChartShell
      categories={categories}
      series={series}
      height={height}
      formatValue={formatValue}
      label="Breakdown chart"
    >
      {categories.map((_, ci) => {
        const groupX = ci * groupWidth + (groupWidth - barWidth) / 2
        let cursor = height
        return series.map((s, si) => {
          const v = s.values[ci] ?? 0
          const barH = (v / max) * (height - 8)
          cursor -= barH
          return <rect key={`${ci}-${si}`} x={groupX} y={cursor} width={barWidth} height={barH} fill={s.color} rx="0.4" />
        })
      })}
    </BarChartShell>
  )
}

/**
 * Horizontal ranked bars, for a snapshot distribution
 * (e.g. transactions by status).
 */
export function RankedBarList({
  items,
  formatValue = (v: number) => String(v),
}: {
  items: { label: string; value: number; color: string }[]
  formatValue?: (v: number) => string
}) {
  if (items.length === 0) return <ChartEmpty />

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-ink-600">{item.label}</span>
            <span className="font-medium tabular-nums text-ink-800">{formatValue(item.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A compact KPI delta tile used above the charts. */
export function TrendStat({
  label,
  value,
  delta,
  deltaLabel,
  tone = 'neutral',
}: {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
  tone?: 'neutral' | 'up' | 'down'
}) {
  const toneClass =
    tone === 'up' ? 'text-ok-600' : tone === 'down' ? 'text-bad-600' : 'text-ink-500'

  return (
    <div className="df-card p-4">
      <p className="text-2xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-ink-900">{value}</p>
      {deltaLabel ? (
        <p className={`mt-1 text-2xs font-medium ${toneClass}`}>
          {delta !== undefined && delta > 0 ? '▲ ' : delta !== undefined && delta < 0 ? '▼ ' : ''}
          {deltaLabel}
        </p>
      ) : null}
    </div>
  )
}

function AxisLabels({ data, labels }: { data?: SeriesPoint[]; labels?: string[] }) {
  const items = labels ?? data?.map((d) => d.label) ?? []
  return (
    <div className="mt-1.5 flex justify-between text-2xs text-ink-400">
      {items.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}

function Legend({
  series,
  formatValue,
}: {
  series: { name: string; color: string; values: number[] }[]
  formatValue: (v: number) => string
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-2xs">
      {series.map((s) => {
        const total = s.values.reduce((a, b) => a + b, 0)
        return (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-ink-500">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
            <span className="font-medium tabular-nums text-ink-700">{formatValue(total)}</span>
          </span>
        )
      })}
    </div>
  )
}

function ChartEmpty() {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-ink-200 text-xs text-ink-400">
      Tidak ada data untuk periode ini
    </div>
  )
}

/**
 * A compact trend line for KPI tiles — no axes, no labels, just the shape of the
 * series. Meant to sit inside a metric card where space is tight and the reader
 * only needs "is this rising or falling".
 */
export function Sparkline({
  values,
  color = '#8f1d24',
  height = 28,
  className,
}: {
  values: number[]
  color?: string
  height?: number
  className?: string
}) {
  if (!values || values.length < 2) return null

  const width = 100
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = width / (values.length - 1)

  const points = values.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return (
    <ChartSvg height={height} width={width} label="Tren" className={className ?? 'w-full'}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </ChartSvg>
  )
}
