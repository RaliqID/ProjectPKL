import type { ReactNode } from 'react'
import clsx from 'clsx'
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import { Button } from './Button'

/** Neutral, informative empty state — never just "No data." */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <p className="text-sm font-medium text-ink-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Skeleton block used while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('relative overflow-hidden rounded-md bg-ink-100', className)} />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={clsx('h-3', c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-24')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-bad-50 text-bad-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink-800">Something went wrong</p>
      <p className="mt-1 max-w-sm text-xs text-ink-500">
        {message ?? 'We could not load this data. Please try again.'}
      </p>
      {onRetry ? (
        <Button className="mt-4" icon={<RotateCw className="h-4 w-4" />} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
