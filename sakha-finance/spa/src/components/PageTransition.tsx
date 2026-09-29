import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * PageTransition: a short fade/slide when the route changes.
 *
 * Without this, a new route swaps its content instantly and the jump reads as a
 * flicker. A 180ms fade in is enough to make the change feel deliberate without
 * making navigation feel slow.
 *
 * Keyed on the pathname so React remounts the wrapper on each navigation, which
 * is what re-triggers the animation. `prefers-reduced-motion` disables it. The
 * wrapper never hides content: it starts slightly transparent and animates to
 * fully visible, so a paused or failed animation still leaves the page readable.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <div
      key={pathname}
      className={reduceMotion ? undefined : 'animate-[page-enter_180ms_ease-out_both]'}
    >
      {children}
    </div>
  )
}
