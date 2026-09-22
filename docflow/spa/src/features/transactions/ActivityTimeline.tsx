import type { ActivityLog } from '@/types/api'
import { formatDateTime, formatRelative, humanizeAction } from '@/lib/format'
import { EmptyState } from '@/components/ui/States'
import clsx from 'clsx'

/** Renders an audit timeline built from real activity log rows. */
export function ActivityTimeline({ logs, compact = false }: { logs: ActivityLog[]; compact?: boolean }) {
  if (logs.length === 0) {
    return <EmptyState title="No activity yet" description="Actions on this record will appear here." />
  }

  return (
    <ol className={clsx('relative', compact ? 'px-5 py-4' : '')}>
      {logs.map((log, index) => (
        <li key={log.id} className="relative flex gap-4 pb-5 last:pb-0">
          {/* Connector */}
          {index < logs.length - 1 ? (
            <span className="absolute left-[9px] top-5 h-full w-px bg-ink-200" aria-hidden />
          ) : null}
          <span className="relative z-10 mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-accent-100">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-xs font-medium text-ink-800">{humanizeAction(log.action)}</p>
              <time className="text-2xs text-ink-400" title={formatDateTime(log.created_at)}>
                {compact ? formatRelative(log.created_at) : formatDateTime(log.created_at)}
              </time>
            </div>
            <p className="mt-0.5 text-xs text-ink-600">{log.description}</p>
            <p className="mt-0.5 text-2xs text-ink-400">{log.user_name}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
