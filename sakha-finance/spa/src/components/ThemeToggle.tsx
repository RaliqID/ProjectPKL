import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

/**
 * Light/dark switch for the app header.
 *
 * Shows the icon of the mode it will switch TO (a sun while dark, a moon while
 * light), which is the convention most users expect from a single-button
 * toggle. The accessible label states the action, not the current state.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const goingDark = resolved === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
      aria-label={goingDark ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
      title={goingDark ? 'Mode gelap' : 'Mode terang'}
    >
      {goingDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  )
}
