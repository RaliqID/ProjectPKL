import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError, ensureCsrf } from '@/lib/api'
import type { AuthUser, Permissions } from '@/types/api'

interface AuthState {
  user: AuthUser | null
  permissions: Permissions | null
  loading: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: AuthUser; permissions: Permissions }>('/api/me')
      setUser(data.user)
      setPermissions(data.permissions)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setPermissions(null)
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      await ensureCsrf()
      if (!active) return
      await refresh()
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [refresh])

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const data = await api.post<{ user: AuthUser; permissions: Permissions }>('/api/login', {
      email,
      password,
      remember,
    })
    setUser(data.user)
    setPermissions(data.permissions)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/logout')
    } finally {
      setUser(null)
      setPermissions(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, permissions, loading, login, logout, refresh }),
    [user, permissions, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
