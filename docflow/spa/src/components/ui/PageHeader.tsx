import type { ReactNode } from 'react'

/** Consistent page header used across all routes. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumb?: ReactNode
}) {
  return (
    <div className="border-b border-ink-200 bg-white">
      <div className="px-6 py-5 lg:px-8">
        {breadcrumb ? <div className="mb-2">{breadcrumb}</div> : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h1>
            {description ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
