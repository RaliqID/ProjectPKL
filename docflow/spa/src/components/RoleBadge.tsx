import { useEffect, useRef, useState } from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { roleMeta } from '@/lib/status'
import { StatusBadge } from '@/components/ui/StatusBadge'
import clsx from 'clsx'

/**
 * Shows the signed-in user's role and, on click, exactly what that role can and
 * cannot do. This is the visible face of the RBAC that is enforced on the server.
 */
export function RoleBadge() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null
  const meta = roleMeta(user.role)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-2xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-800"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={meta.summary}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-ink-400" />
        <span className="hidden sm:inline">{meta.label}</span>
        <Info className="h-3 w-3 text-ink-300" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Your role and permissions"
          className="absolute right-0 top-full z-40 mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-ink-200 bg-white p-4 shadow-pop animate-slide-up"
        >
          <div className="flex items-center gap-2">
            <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
            <span className="text-2xs text-ink-400">signed in as {user.name}</span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-500">{meta.summary}</p>

          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ok-700">Can</p>
            <ul className="mt-1.5 space-y-1">
              {meta.capabilities.map((c) => (
                <li key={c} className="flex items-start gap-2 text-2xs text-ink-600">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ok-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {meta.cannot.length > 0 ? (
            <div className="mt-3 border-t border-ink-100 pt-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Locked for this role</p>
              <ul className="mt-1.5 space-y-1">
                {meta.cannot.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-2xs text-ink-400">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 border-t border-ink-100 pt-3 text-2xs text-ink-400">
            Permissions are enforced on the server, not just hidden here.
          </p>
        </div>
      ) : null}
    </div>
  )
}

/**
 * A calm, dismissible-free banner that explains why write actions are hidden for
 * read-only roles, so the UI never feels broken.
 */
export function ReadOnlyBanner({ className }: { className?: string }) {
  const { permissions, user } = useAuth()
  if (!permissions || permissions.can_write_transactions) return null

  const meta = roleMeta(user?.role)

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-lg border border-warn-200 bg-warn-50 px-4 py-3',
        className,
      )}
      role="note"
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" aria-hidden />
      <div className="text-xs text-warn-800">
        <p className="font-medium">Read-only access ({meta.label})</p>
        <p className="mt-0.5 text-warn-700">
          Your role reviews and approves but does not create or edit operational records. You can still
          verify or reject documents and review verification results.
        </p>
      </div>
    </div>
  )
}

/**
 * Documents page note: tells the current role whether they can review documents.
 */
export function DocumentReviewNote({ className }: { className?: string }) {
  const { permissions, user } = useAuth()
  if (!permissions) return null

  const canReview = permissions.can_review_documents
  const meta = roleMeta(user?.role)

  return (
    <div
      className={clsx(
        'mb-4 flex items-start gap-3 rounded-lg border px-4 py-3',
        canReview ? 'border-ok-200 bg-ok-50' : 'border-ink-200 bg-ink-50',
        className,
      )}
      role="note"
    >
      <ShieldCheck
        className={clsx('mt-0.5 h-4 w-4 shrink-0', canReview ? 'text-ok-600' : 'text-ink-400')}
        aria-hidden
      />
      <div className={clsx('text-xs', canReview ? 'text-ok-800' : 'text-ink-600')}>
        <p className="font-medium">
          {canReview ? `You can review documents (${meta.label})` : `View-only documents (${meta.label})`}
        </p>
        <p className={clsx('mt-0.5', canReview ? 'text-ok-700' : 'text-ink-500')}>
          {canReview
            ? 'Open a transaction to verify or reject its documents. Document actions live on the transaction detail page.'
            : 'Switch to a Reviewer or Administrator account to verify or reject documents.'}
        </p>
      </div>
    </div>
  )
}
