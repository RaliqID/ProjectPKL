import { RefreshCw } from 'lucide-react'
import { useLiveData, useRefreshAll } from '@/lib/live'
import clsx from 'clsx'

/**
 * Truthful live indicator: shows a real dot when connected and a real
 * "updated Ns ago" counter driven by the polling hook — not a fake animation.
 */
export function LiveIndicator() {
  const { lastUpdated, isRefreshing, secondsAgo } = useLiveData()
  const { refreshAll, isRefreshing: manualRefreshing } = useRefreshAll()
  const busy = isRefreshing || manualRefreshing

  const label =
    secondsAgo === null
      ? 'Langsung'
      : secondsAgo < 5
        ? 'Langsung · baru saja'
        : `Langsung · ${secondsAgo} dtk lalu`

  return (
    <button
      type="button"
      onClick={() => refreshAll()}
      className={clsx(
        'group inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-2xs font-medium text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-700',
      )}
      title={lastUpdated ? `Terakhir diperbarui ${lastUpdated.toLocaleTimeString()}` : 'Menghubungkan…'}
      aria-label="Status langsung, klik untuk menyegarkan"
    >
      <span className="relative flex h-2 w-2">
        <span
          className={clsx(
            'absolute inline-flex h-full w-full rounded-full opacity-60',
            busy ? 'animate-ping bg-warn-400' : 'bg-ok-400',
          )}
        />
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', busy ? 'bg-warn-500' : 'bg-ok-500')} />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <RefreshCw className={clsx('h-3 w-3 text-ink-400', busy && 'animate-spin')} />
    </button>
  )
}
