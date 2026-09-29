import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  Archive,
  BadgeCheck,
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileBarChart,
  FileText,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  ShoppingCart,
  TrendingUp,
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
import { Logo } from '@/components/Logo'
import { RoleBadge } from '@/components/RoleBadge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Footer } from '@/components/Footer'
import { PageTransition } from '@/components/PageTransition'
import { AnimatedGrid } from '@/components/AnimatedGrid'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

/**
 * Module list for Finance Operations. Order follows the operational flow:
 * a transaction becomes an invoice, is paid, shipped, filed, verified, then
 * archived — with checking, expense and procurement as supporting processes.
 */
const NAV: NavItem[] = [
  { to: '/app', label: 'Beranda', icon: LayoutDashboard },
  { to: '/app/transaksi', label: 'Transaksi', icon: Receipt },
  { to: '/app/invoice', label: 'Invoice', icon: FileText },
  { to: '/app/pembayaran', label: 'Pembayaran', icon: Wallet },
  { to: '/app/pengiriman', label: 'Pengiriman', icon: Truck },
  { to: '/app/dokumen', label: 'Dokumen', icon: FileText },
  { to: '/app/arsip', label: 'Arsip', icon: Archive },
  { to: '/app/verifikasi', label: 'Verifikasi', icon: BadgeCheck },
  { to: '/app/ketelitian', label: 'Pemeriksaan Ketelitian', icon: ClipboardCheck },
  { to: '/app/analitik', label: 'Analitik', icon: TrendingUp },
  { to: '/app/pengeluaran', label: 'Pengeluaran', icon: Fuel },
  { to: '/app/pengadaan', label: 'Pengadaan', icon: ShoppingCart },
  { to: '/app/pelanggan', label: 'Pelanggan', icon: Users },
  { to: '/app/aktivitas', label: 'Aktivitas', icon: Activity },
  { to: '/app/laporan', label: 'Laporan', icon: FileBarChart },
  { to: '/app/pengaturan', label: 'Pengaturan', icon: SettingsIcon, adminOnly: true },
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
        Lewati ke konten
      </a>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-ink-200 bg-white transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
          <Logo to="/" size="md" withTagline />
          <button
            type="button"
            className="rounded-md p-1 text-ink-400 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup navigasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* The module list is long (14 entries). It scrolls on its own so the
            header and the account block stay pinned, and the list never depends
            on the page scroll position. */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2" aria-label="Menu utama">
          <ul className="space-y-px">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors',
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

        <div className="shrink-0 border-t border-ink-200 p-3">
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
              aria-label="Keluar"
              title="Keluar"
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
            aria-label="Buka navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <RoleBadge />
            <LiveIndicator />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              aria-label="Notifikasi"
            >
              <Bell className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              <NotificationDot />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-ink-100"
                aria-label="Menu akun"
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
                    Keluar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {notifOpen ? <NotificationPanel onClose={() => setNotifOpen(false)} /> : null}

        <main id="main" className="relative flex min-h-[calc(100vh-3.5rem)] flex-col">
          {/* A very faint grid behind the workspace. The app is data-dense, so
              this sits at low opacity and stays out of the way of tables; it
              exists to tie the app back to the landing/login surfaces rather
              than to be noticed. */}
          <AnimatedGrid className="opacity-[0.4]" />
          <div className="relative flex-1">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
          <Footer variant="app" />
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
    window.addEventListener('sakha:unread', handler as EventListener)
    return () => window.removeEventListener('sakha:unread', handler as EventListener)
  }, [])

  if (count <= 0) return null

  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad-500 px-1 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
