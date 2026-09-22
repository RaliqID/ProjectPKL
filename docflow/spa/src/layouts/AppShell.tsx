import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  BadgeCheck,
  Bell,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { initials } from '@/lib/format'
import { GlobalSearch } from '@/components/GlobalSearch'
import { NotificationPanel } from '@/components/NotificationPanel'
import { LiveIndicator } from '@/components/LiveIndicator'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/payments', label: 'Payments', icon: Wallet },
  { to: '/app/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/app/activity', label: 'Activity', icon: Activity },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    setNotifOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const items = NAV.filter((item) => !item.adminOnly || user?.role === 'ADMIN')

  return (
    <div className="min-h-screen bg-ink-50">
      <a href="#main" className="df-skip-link">
        Skip to content
      </a>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-ink-200 bg-white transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-600 text-xs font-bold text-white">
              DF
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold tracking-tight text-ink-900">DOCFLOW</p>
              <p className="mt-0.5 text-2xs text-ink-400">Organize. Verify. Track.</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-ink-400 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Main">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-ink-200 p-3">
          <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
              {initials(user?.name ?? '?')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink-800">{user?.name}</p>
              <p className="truncate text-2xs text-ink-400">{user?.role_label}</p>
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/login'))}
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-bad-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-ink-900/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      ) : null}

      {/* Main column */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <LiveIndicator />
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              <NotificationDot />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-ink-100"
                aria-label="Account menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-2xs font-semibold text-accent-700">
                  {initials(user?.name ?? '?')}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-ink-200 bg-white p-1 shadow-pop animate-slide-up">
                  <div className="border-b border-ink-100 px-3 py-2">
                    <p className="truncate text-xs font-medium text-ink-800">{user?.name}</p>
                    <p className="truncate text-2xs text-ink-400">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout().then(() => navigate('/login'))}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {notifOpen ? <NotificationPanel onClose={() => setNotifOpen(false)} /> : null}

        <main id="main" className="min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NotificationDot() {
  // The count is fetched by the NotificationPanel; here we show a lightweight
  // indicator driven by the shared unread-count query via a custom event.
  const [count, setCount] = useState(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail
      setCount(typeof detail === 'number' ? detail : 0)
    }
    window.addEventListener('docflow:unread', handler as EventListener)
    return () => window.removeEventListener('docflow:unread', handler as EventListener)
  }, [])

  if (count <= 0) return null

  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad-500 px-1 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
