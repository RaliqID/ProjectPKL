import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CheckCheck, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { AppNotification } from '@/types/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SEVERITY_META } from '@/lib/status'
import { formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/lib/toast'
import { reportFailure, reportQuietly } from '@/lib/report'

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const load = async () => {
    try {
      const data = await api.get<{ data: AppNotification[]; meta: { unread_count: number } }>(
        '/api/notifications?per_page=20',
      )
      setItems(data.data)
      window.dispatchEvent(new CustomEvent('docflow:unread', { detail: data.meta.unread_count }))
    } catch (error) {
      // An empty panel is the right fallback, but a failed fetch and "no
      // notifications" must not look identical in a log.
      reportQuietly('load notifications', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markAll = async () => {
    try {
      await api.post('/api/notifications/mark-all-read')
      setItems((current) => current.map((n) => ({ ...n, is_unread: false, read_at: new Date().toISOString() })))
      window.dispatchEvent(new CustomEvent('docflow:unread', { detail: 0 }))
      toast.success('All notifications marked as read')
    } catch (error) {
      // The cause is logged rather than discarded, so a failure that a user
      // reports can actually be looked up.
      reportFailure('mark all notifications read', error, toast, 'Could not update notifications')
    }
  }

  const open = async (n: AppNotification) => {
    if (n.is_unread) {
      try {
        await api.post(`/api/notifications/${n.id}/read`)
        setItems((current) => current.map((i) => (i.id === n.id ? { ...i, is_unread: false } : i)))
      } catch (error) {
        // Non-fatal on purpose: navigation still happens, and the badge will be
        // corrected on the next poll. Only the cause is recorded, so the failure
        // is not silent.
        reportQuietly('mark notification read', error)
      }
    }
    if (n.entity_type === 'transaction' && n.entity_id) {
      onClose()
      navigate(`/transactions/${n.entity_id}`)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div className="absolute right-4 top-14 z-40 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-ink-200 bg-white shadow-pop animate-slide-up lg:right-6">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">Notifications</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={markAll}
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Mark all as read"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-ink-400">Loadingâ€¦</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <BellOff className="mb-2 h-5 w-5 text-ink-300" aria-hidden />
              <p className="text-xs text-ink-500">You are all caught up.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {items.map((n) => {
                const sev = SEVERITY_META[n.severity] ?? SEVERITY_META.LOW
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50"
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.is_unread ? 'bg-accent-500' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-ink-800">{n.title}</p>
                          <StatusBadge label={sev.label} tone={sev.tone} dot={false} />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-2xs text-ink-500">{n.message}</p>
                        <p className="mt-1 text-2xs text-ink-400">{formatRelative(n.created_at)}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {!loading && items.length > 0 ? (
          <div className="border-t border-ink-100 px-3 py-2">
            <Button variant="ghost" className="w-full text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}
