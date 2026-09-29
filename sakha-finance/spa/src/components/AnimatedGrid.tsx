import clsx from 'clsx'

/**
 * AnimatedGrid: a slow-drifting square grid used as a background texture.
 *
 * Why a grid: the hero is a wide, mostly empty band, and a flat fill reads as
 * unfinished. A faint grid gives the section a sense of place (a ledger sheet)
 * without competing with the copy.
 *
 * Interaction: the grid drifts on its own at a low speed, then speeds up and
 * brightens while the pointer is over the hero. Movement is the only cue, so
 * the effect stays subtle. The drift is a transform on an oversized layer, so
 * it runs on the compositor and never triggers layout.
 *
 * Themes: the line colour is a token (`--grid-line`) defined for light and dark
 * in index.css, so the grid stays visible on both without a second component.
 *
 * Accessibility: the layer is `aria-hidden` and `pointer-events-none`, so it is
 * decoration only and never blocks a click on the hero. `prefers-reduced-motion`
 * stops the drift entirely (the grid still shows, it just holds still).
 */
export function AnimatedGrid({
  active = false,
  vignette = true,
  className,
}: {
  active?: boolean
  vignette?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 overflow-hidden',
        'motion-reduce:[&>div]:animate-none',
        className,
      )}
    >
      <div
        className={clsx(
          'absolute -inset-[60%] will-change-transform motion-reduce:animate-none',
          active
            ? 'animate-[grid-drift_9s_linear_infinite] opacity-[0.9]'
            : 'animate-[grid-drift_34s_linear_infinite] opacity-[0.5]',
        )}
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--grid-line) 1px, transparent 1px),' +
            'linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transition: 'opacity 600ms ease-out',
        }}
      />
      {/* Soft vignette so the grid fades toward the edges instead of ending on
          a hard line. Off for panels with their own dark backing, where the
          section-background gradient would band. */}
      {vignette ? (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-50" />
      ) : null}
    </div>
  )
}
