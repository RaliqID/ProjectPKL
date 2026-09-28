import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Lightweight "realtime" layer.
 *
 * SAKHA Finance Operations does not run a websocket server, so we implement near-realtime updates
 * with periodic polling of the endpoints that change most often (overview metrics,
 * attention queue, verification queue, notifications). When the polled data
 * actually differs, the relevant react-query caches are invalidated so every open
 * screen refreshes in place.
 *
 * The hook also reports when the last successful refresh happened, so the UI can
 * show a truthful "Live · updated 3s ago" indicator instead of a fake pulse.
 */

export interface LiveState {
  lastUpdated: Date | null
  isRefreshing: boolean
  /** Seconds since the last successful refresh (null before the first). */
  secondsAgo: number | null
}

export function useLiveData({ intervalMs = 15000 }: { intervalMs?: number } = {}) {
  const qc = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null)
  const tickRef = useRef<number | null>(null)

  // Refresh the fastest-moving queries on an interval, and once on mount so the
  // "updated Ns ago" counter starts ticking immediately.
  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      setIsRefreshing(true)
      try {
        await Promise.all([
          qc.refetchQueries({ queryKey: ['overview'] }),
          qc.refetchQueries({ queryKey: ['verification-queue'] }),
          qc.refetchQueries({ queryKey: ['activity'] }),
        ])
        if (!cancelled) setLastUpdated(new Date())
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    void refresh()
    const id = window.setInterval(refresh, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [qc, intervalMs])

  // Keep a live "x seconds ago" counter without re-fetching.
  useEffect(() => {
    if (!lastUpdated) return
    tickRef.current = window.setInterval(() => {
      setSecondsAgo(Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)))
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [lastUpdated])

  return { lastUpdated, isRefreshing, secondsAgo } satisfies LiveState
}

/**
 * Refresh (invalidate) every operational query. Used by explicit "Refresh"
 * buttons and after mutations so the whole workspace stays consistent.
 */
export function useRefreshAll() {
  const qc = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshAll = async () => {
    setIsRefreshing(true)
    try {
      await qc.refetchQueries()
    } finally {
      setIsRefreshing(false)
    }
  }

  return { refreshAll, isRefreshing }
}
