import clsx from 'clsx'
import type { Tone } from '@/types/api'

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  success: 'bg-ok-50 text-ok-700 ring-ok-100',
  warning: 'bg-warn-50 text-warn-700 ring-warn-100',
  danger: 'bg-bad-50 text-bad-700 ring-bad-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
  muted: 'bg-ink-50 text-ink-500 ring-ink-200',
}

const DOT_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink-400',
  success: 'bg-ok-500',
  warning: 'bg-warn-500',
  danger: 'bg-bad-500',
  info: 'bg-info-500',
  muted: 'bg-ink-300',
}

interface StatusBadgeProps {
  label: string
  tone?: Tone
  dot?: boolean
  className?: string
}

export function StatusBadge({ label, tone = 'neutral', dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span className={clsx('h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])} aria-hidden /> : null}
      {label}
    </span>
  )
}
