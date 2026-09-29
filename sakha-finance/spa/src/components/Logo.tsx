import { Link } from 'react-router-dom'
import clsx from 'clsx'

/**
 * Sakha Internasional wordmark.
 *
 * Uses the company's own logo asset (public/sakha-logo.png) as the mark, paired
 * with the "SAKHA INTERNASIONAL / Finance Operations" lockup. The logo is the
 * company's real identity rather than an invented mark; this is a project built
 * from PKL work at the company, so using its logo is appropriate and honest.
 */

interface LogoMarkProps {
  className?: string
  /** Kept for API compatibility; the logo asset already carries its shape. */
  tile?: boolean
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center', className)} aria-hidden>
      <img src="/sakha-logo.png" alt="" className="h-full w-full object-contain" />
    </span>
  )
}

interface LogoProps {
  /** 'dark' renders the wordmark for light backgrounds; 'light' for dark panels. */
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  /** Show the "SAKHA INTERNASIONAL" wordmark next to the mark. */
  withWordmark?: boolean
  /** Show the "Finance Operations" line under the wordmark. */
  withTagline?: boolean
  /** When provided, the whole logo becomes a link back to the landing page. */
  to?: string
  className?: string
}

const SIZES = {
  sm: { tile: 'h-6 w-6', word: 'text-xs', tag: 'text-[9px]' },
  md: { tile: 'h-8 w-8', word: 'text-sm', tag: 'text-2xs' },
  lg: { tile: 'h-10 w-10', word: 'text-base', tag: 'text-xs' },
}

export function Logo({
  variant = 'dark',
  size = 'md',
  withWordmark = true,
  withTagline = false,
  to,
  className,
}: LogoProps) {
  const s = SIZES[size]

  const content = (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={s.tile} />
      {withWordmark ? (
        <span className="leading-none">
          <span
            className={clsx(
              'block font-semibold tracking-[0.01em]',
              s.word,
              variant === 'dark' ? 'text-ink-900' : 'text-white',
            )}
          >
            SAKHA INTERNASIONAL
          </span>
          {withTagline ? (
            <span
              className={clsx(
                'mt-1 block font-medium uppercase tracking-[0.14em]',
                s.tag,
                variant === 'dark' ? 'text-ink-400' : 'text-ink-300',
              )}
            >
              Finance Operations
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex items-center rounded-md focus-visible:outline-none"
        aria-label="Sakha Internasional — Finance Operations"
      >
        {content}
      </Link>
    )
  }

  return content
}
