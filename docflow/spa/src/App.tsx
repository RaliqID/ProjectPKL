import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { LogoMark } from '@/components/Logo'
import { useAuth } from '@/lib/auth'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { TransactionDetailPage } from '@/pages/TransactionDetailPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { DeliveriesPage } from '@/pages/DeliveriesPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { VerificationPage } from '@/pages/VerificationPage'
import { ActivityPage } from '@/pages/ActivityPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-9 w-9" />
        <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden />
        <p className="text-xs text-ink-400">Loading workspace…</p>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated application, mounted under /app */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="deliveries" element={<DeliveriesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route
          path="settings"
          element={
            <RequireAdmin>
              <SettingsPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
