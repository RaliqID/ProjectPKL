import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

/**
 * Theme (light / dark / system).
 *
 * The choice persists in localStorage and is applied as a `dark` class on
 * <html>. A tiny inline script in index.html applies the stored theme BEFORE
 * React mounts, so there is no flash of the wrong theme on load.
 *
 * Dark mode here is a set of token overrides (see index.css `.dark`) rather
 * than `dark:` variants on every element: the app is large, and overriding the
 * ink/accent/surface tokens in one place keeps every existing component correct
 * without touching each one.
 */

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'sakha-theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* localStorage can throw in private mode; fall through to default */
  }
  // Default to LIGHT, not "system". The system default surprised users whose
  // OS is dark — the whole app opened dark without them asking. Light is the
  // safer default; anyone who wants dark picks it with the header toggle.
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolve(readStored()))
  const { user } = useAuth()

  // When a user logs in, adopt their saved preference (server is the source of
  // truth across devices). Guarded so this does not run on every render, and
  // skipped once the user changes the theme in this session.
  const adoptedForUser = useRef<number | null>(null)
  useEffect(() => {
    if (!user) {
      adoptedForUser.current = null
      return
    }
    if (adoptedForUser.current === user.id) return
    adoptedForUser.current = user.id

    const pref = user.theme_preference
    if (pref === 'light' || pref === 'dark' || pref === 'system') {
      setThemeState(pref)
      try {
        localStorage.setItem(STORAGE_KEY, pref)
      } catch {
        /* ignore */
      }
    }
  }, [user])

  // Apply the class synchronously before paint to avoid a flash.
  useLayoutEffect(() => {
    const next = resolve(theme)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next
    setResolved(next)
  }, [theme])

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = mq.matches ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.style.colorScheme = next
      setResolved(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore */
    }
    // Persist to the server when signed in, so the choice follows the account.
    // Failure is non-fatal: localStorage already holds the choice.
    if (user) {
      api.put('/api/me/preferences', { theme_preference: t }).catch(() => {})
    }
  }

  const toggle = () => setTheme(resolved === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
