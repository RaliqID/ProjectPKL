import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { Tone } from '@/types/api'

/** A single KPI tile. Value is text (already formatted) to keep money types safe. */
export function Metric({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
  onClick,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  icon?: ReactNode
  onClick?: () => void
}) {
  const toneRing: Record<Tone, string> = {
    neutral: 'text-ink-400',
    success: 'text-ok-600',
    warning: 'text-warn-600',
    danger: 'text-bad-600',
    info: 'text-info-600',
    muted: 'text-ink-300',
  }

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={clsx(
        'df-card flex flex-col gap-2 p-4 text-left',
        onClick && 'transition-shadow hover:shadow-pop',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{label}</span>
        {icon ? <span className={toneRing[tone]}>{icon}</span> : null}
      </div>
      <div className="text-xl font-semibold tracking-tight text-ink-900">{value}</div>
      {sub ? <div className="text-xs text-ink-400">{sub}</div> : null}
    </Wrapper>
  )
}
