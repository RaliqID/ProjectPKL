import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileWarning,
  Receipt,
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
import { metaFor, SEVERITY_META, TRANSACTION_STATUS } from '@/lib/status'

export function OverviewPage() {
  const { data, isLoading, error, refetch } = useOverview()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Overview"
        description="What needs attention right now across transactions, documents, payments and deliveries."
      />

      <div className="space-y-6 p-6 lg:p-8">
        {error ? (
          <div className="df-card">
            <ErrorState message="Could not load the overview." onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <OverviewSkeleton />
        ) : (
          <>
            {/* Metric row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric
                label="Total Transactions"
                value={data.metrics.total_transactions}
                sub={`${data.metrics.transactions_this_month} this month`}
                icon={<Receipt className="h-4 w-4" />}
                onClick={() => navigate('/transactions')}
              />
              <Metric
                label="Needs Review"
                value={data.metrics.needs_review}
                sub={`${data.metrics.verification_failures} with failed checks`}
                tone={data.metrics.needs_review > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle className="h-4 w-4" />}
                onClick={() => navigate('/transactions?status=NEEDS_REVIEW')}
              />
              <Metric
                label="Outstanding Payment"
                value={formatIDR(data.metrics.outstanding_payment_amount)}
                sub={`${data.metrics.overdue_invoices} overdue invoices`}
                tone={Number(data.metrics.outstanding_payment_amount) > 0 ? 'warning' : 'success'}
                icon={<Wallet className="h-4 w-4" />}
                onClick={() => navigate('/payments')}
              />
              <Metric
                label="Documents Pending"
                value={data.metrics.pending_documents}
                sub={`${data.metrics.active_deliveries} active deliveries`}
                icon={<FileWarning className="h-4 w-4" />}
                onClick={() => navigate('/documents?status=UPLOADED')}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Attention queue */}
              <div className="df-card xl:col-span-2">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warn-500" aria-hidden />
                    <h2 className="text-sm font-semibold text-ink-900">Attention Queue</h2>
                  </div>
                  <span className="text-xs text-ink-400">{data.attention.length} item(s)</span>
                </div>

                {data.attention.length === 0 ? (
                  <EmptyState
                    title="Nothing needs attention"
                    description="No missing documents, overdue payments, or failed verifications right now."
                    icon={<CheckCircle2 className="h-5 w-5 text-ok-500" />}
                  />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {data.attention.map((item, index) => {
                      const sev = SEVERITY_META[item.severity] ?? SEVERITY_META.LOW
                      return (
                        <li key={`${item.type}-${item.entity_id}-${index}`}>
                          <button
                            type="button"
                            onClick={() => navigate(`/transactions/${item.entity_id}`)}
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
                )}
              </div>

              {/* Status breakdown + operational summary */}
              <div className="space-y-6">
                <div className="df-card">
                  <div className="border-b border-ink-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-ink-900">Transactions by Status</h2>
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {Object.entries(data.status_breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => {
                        const meta = metaFor(TRANSACTION_STATUS, status)
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
                    <h2 className="text-sm font-semibold text-ink-900">Operational Summary</h2>
                  </div>
                  <dl className="divide-y divide-ink-100 text-sm">
                    <SummaryRow
                      icon={<BadgeCheck className="h-4 w-4 text-ink-400" />}
                      label="Completed"
                      value={data.metrics.completed_transactions}
                    />
                    <SummaryRow
                      icon={<Truck className="h-4 w-4 text-ink-400" />}
                      label="Active deliveries"
                      value={data.metrics.active_deliveries}
                    />
                    <SummaryRow
                      icon={<Clock className="h-4 w-4 text-ink-400" />}
                      label="Delayed deliveries"
                      value={data.metrics.delayed_deliveries}
                      danger={data.metrics.delayed_deliveries > 0}
                    />
                    <SummaryRow
                      icon={<Wallet className="h-4 w-4 text-ink-400" />}
                      label="Overdue amount"
                      value={formatIDR(data.metrics.overdue_invoices_amount)}
                      danger={data.metrics.overdue_invoices > 0}
                    />
                  </dl>
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="df-card">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-ink-900">Recent Activity</h2>
                <button
                  type="button"
                  onClick={() => navigate('/activity')}
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  View all
                </button>
              </div>
              {data.recent_activity.length === 0 ? (
                <EmptyState title="No activity yet" description="Actions across the workspace will show up here." />
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
