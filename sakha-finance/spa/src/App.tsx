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
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { TransactionDetailPage } from '@/pages/TransactionDetailPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { DeliveriesPage } from '@/pages/DeliveriesPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { VerificationPage } from '@/pages/VerificationPage'
import { ArsipPage } from '@/pages/ArsipPage'
import { KetelitianPage } from '@/pages/KetelitianPage'
import { PengeluaranPage } from '@/pages/PengeluaranPage'
import { PengadaanPage } from '@/pages/PengadaanPage'
import { ActivityPage } from '@/pages/ActivityPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-9 w-9" />
        <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden />
        <p className="text-xs text-ink-400">Memuat ruang kerja…</p>
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
      {/* Public entry */}
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
        <Route path="transaksi" element={<TransactionsPage />} />
        <Route path="transaksi/:id" element={<TransactionDetailPage />} />
        <Route path="invoice" element={<InvoicesPage />} />
        <Route path="pembayaran" element={<PaymentsPage />} />
        <Route path="pengiriman" element={<DeliveriesPage />} />
        <Route path="dokumen" element={<DocumentsPage />} />
        <Route path="arsip" element={<ArsipPage />} />
        <Route path="verifikasi" element={<VerificationPage />} />
        <Route path="ketelitian" element={<KetelitianPage />} />
        <Route path="pengeluaran" element={<PengeluaranPage />} />
        <Route path="pengadaan" element={<PengadaanPage />} />
        <Route path="pelanggan" element={<CustomersPage />} />
        <Route path="pelanggan/:id" element={<CustomerDetailPage />} />
        <Route path="aktivitas" element={<ActivityPage />} />
        <Route path="laporan" element={<ReportsPage />} />
        <Route path="analitik" element={<AnalyticsPage />} />
        <Route
          path="pengaturan"
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
