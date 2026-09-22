import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastContextValue {
  push: (kind: ToastKind, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = ++counter
      setToasts((current) => [...current, { id, kind, title, message }])
      window.setTimeout(() => remove(id), kind === 'error' ? 7000 : 4500)
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: { icon: CheckCircle2, ring: 'border-ok-200', text: 'text-ok-700', bg: 'bg-ok-50' },
    error: { icon: TriangleAlert, ring: 'border-bad-200', text: 'text-bad-700', bg: 'bg-bad-50' },
    info: { icon: Info, ring: 'border-info-200', text: 'text-info-700', bg: 'bg-info-50' },
  }[toast.kind]

  const Icon = config.icon

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border ${config.ring} ${config.bg} p-3.5 shadow-pop animate-slide-up`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.text}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${config.text}`}>{toast.title}</p>
        {toast.message ? <p className="mt-0.5 text-xs text-ink-600">{toast.message}</p> : null}
      </div>
      <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-600" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
