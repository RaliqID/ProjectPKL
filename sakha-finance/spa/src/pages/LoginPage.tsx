import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Form'
import { Logo } from '@/components/Logo'
import { AnimatedGrid } from '@/components/AnimatedGrid'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('operator@sakha.test')
  const [password, setPassword] = useState('password')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-5 w-5 animate-spin text-ink-400" aria-hidden />
      </div>
    )
  }

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/app'
    return <Navigate to={from} replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await login(email.trim(), password, remember)
      const from = (location.state as { from?: string } | null)?.from ?? '/app'
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { email: [error.message] })
      } else {
        setErrors({ email: ['Gagal masuk. Silakan coba lagi.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Panel identitas: carries the same drifting grid as the landing hero,
          so the two pages read as one product. The grid token flips with the
          theme, and the panel itself is dark, so the light line variant shows. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-10 text-white lg:flex">
        <AnimatedGrid className="opacity-70" vignette={false} />
        <div className="relative">
          <Logo to="/" variant="light" size="md" withTagline />
        </div>
        <div className="relative max-w-md">
          <h1 className="animate-[slide-up_600ms_ease-out_100ms_both] text-2xl font-semibold leading-snug tracking-tight">
            Satu alur kerja untuk data Finance yang lebih tertata.
          </h1>
          <p className="mt-4 animate-[slide-up_600ms_ease-out_220ms_both] text-sm leading-relaxed text-ink-300">
            Menghubungkan transaksi, invoice, pembayaran, pengiriman, dokumen, dan verifikasi dalam satu alur kerja yang
            dapat ditelusuri, sehingga tidak ada berkas yang tercecer antar marketplace, spreadsheet, dan obrolan.
          </p>
          <div className="mt-8 grid animate-[slide-up_600ms_ease-out_340ms_both] grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs text-ink-400">
            <div>
              <p className="font-medium text-white">Tertata</p>
              <p className="mt-1">Dokumen & transaksi dalam satu tempat.</p>
            </div>
            <div>
              <p className="font-medium text-white">Terverifikasi</p>
              <p className="mt-1">Pemeriksaan tetap dengan alasan yang jelas.</p>
            </div>
            <div>
              <p className="font-medium text-white">Tertelusur</p>
              <p className="mt-1">Status dan riwayat yang dapat diaudit.</p>
            </div>
          </div>
        </div>
        <p className="relative animate-[fade-in_800ms_ease-out_500ms_both] text-2xs text-ink-500">
          Prototype pengembangan berdasarkan kegiatan PKL di PT. Sakha Internasional. Bukan sistem produksi resmi
          perusahaan.
        </p>
      </div>

      {/* Panel formulir: the card rises in, then the fields follow in sequence so
          the eye lands on the first input. */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm animate-[slide-up_500ms_ease-out_both]">
          <Logo to="/" size="md" className="mb-8 lg:hidden" withTagline />

          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Masuk</h2>
          <p className="mt-1 text-sm text-ink-500">Gunakan akun demo untuk menjelajahi sistem.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="animate-[slide-up_500ms_ease-out_120ms_both]">
              <TextInput
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
              />
            </div>
            <div className="animate-[slide-up_500ms_ease-out_200ms_both]">
              <TextInput
                label="Kata Sandi"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
              />
            </div>

            <label className="flex animate-[fade-in_500ms_ease-out_280ms_both] items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600 focus:ring-accent-200"
              />
              Ingat sesi ini
            </label>

            <div className="animate-[slide-up_500ms_ease-out_320ms_both]">
              <Button type="submit" variant="primary" className="group w-full" loading={submitting}>
                Masuk
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </div>
          </form>

          <div className="mt-6 animate-[slide-up_500ms_ease-out_360ms_both] rounded-lg border border-ink-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
              <LockKeyhole className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              Akun demo
            </div>
            <ul className="mt-2 space-y-1 font-mono text-2xs text-ink-500">
              <li>admin@sakha.test · password</li>
              <li>operator@sakha.test · password</li>
              <li>reviewer@sakha.test · password</li>
            </ul>
          </div>

          <p className="mt-6 animate-[fade-in_600ms_ease-out_460ms_both] text-center text-xs text-ink-500">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">
              Buat akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
