import { Link } from 'react-router-dom'
import clsx from 'clsx'

/**
 * DOCFLOW logo.
 *
 * The mark is two stacked document sheets with a connected flow line — the
 * product idea in one glyph: documents that move through one traceable workflow.
 * It is drawn as inline SVG so it scales crisply and inherits the accent colour.
 */

interface LogoMarkProps {
  className?: string
  /** Rounded-tile background (brand) vs. bare glyph. */
  tile?: boolean
}

export function LogoMark({ className, tile = true }: LogoMarkProps) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center',
        tile && 'rounded-md bg-accent-600 text-white',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        {/* back sheet */}
        <path
          d="M8.2 4.6h5.1l3.4 3.4v8.2a1.4 1.4 0 0 1-1.4 1.4H8.2a1.4 1.4 0 0 1-1.4-1.4V6a1.4 1.4 0 0 1 1.4-1.4Z"
          className="opacity-45"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* front sheet */}
        <path
          d="M11 8h5.1l2.3 2.3V17a1.4 1.4 0 0 1-1.4 1.4H11A1.4 1.4 0 0 1 9.6 17V9.4A1.4 1.4 0 0 1 11 8Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* flow arrow: the "flow" in docflow */}
        <path
          d="M12.3 12.6h3.1m0 0-1.15-1.15M15.4 12.6l-1.15 1.15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

interface LogoProps {
  /** 'dark' renders the glyph for light backgrounds; 'light' for dark panels. */
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  /** Show the "DOCFLOW" wordmark next to the mark. */
  withWordmark?: boolean
  /** Show the "Organize. Verify. Track." tagline under the wordmark. */
  withTagline?: boolean
  /** If set, the whole logo is a link (used to return to the landing page). */
  to?: string
  className?: string
}

const SIZES = {
  sm: { tile: 'h-6 w-6', word: 'text-xs', tag: 'text-[9px]' },
  md: { tile: 'h-7 w-7', word: 'text-sm', tag: 'text-2xs' },
  lg: { tile: 'h-9 w-9', word: 'text-base', tag: 'text-xs' },
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
              'block font-semibold tracking-tight',
              s.word,
              variant === 'dark' ? 'text-ink-900' : 'text-white',
            )}
          >
            DOCFLOW
          </span>
          {withTagline ? (
            <span
              className={clsx(
                'mt-0.5 block',
                s.tag,
                variant === 'dark' ? 'text-ink-400' : 'text-ink-300',
              )}
            >
              Organize. Verify. Track.
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center rounded-md focus-visible:outline-none" aria-label="DOCFLOW home">
        {content}
      </Link>
    )
  }

  return content
}
