import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { TextInput, Select } from '@/components/ui/Form'
import { Logo } from '@/components/Logo'
import { AnimatedGrid } from '@/components/AnimatedGrid'

export function RegisterPage() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'OPERATOR',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-5 w-5 animate-spin text-ink-400" aria-hidden />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
      })
      navigate('/app', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { email: [error.message] })
      } else {
        setErrors({ email: ['Tidak dapat membuat akun Anda. Silakan coba lagi.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Brand panel: same drifting grid as the login page and landing hero, so
          the three entry surfaces read as one product. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-10 text-white lg:flex">
        <AnimatedGrid className="opacity-70" vignette={false} />
        <div className="relative">
          <Logo to="/" variant="light" size="md" />
        </div>
        <div className="relative max-w-md">
          <h1 className="animate-[slide-up_600ms_ease-out_100ms_both] text-2xl font-semibold leading-snug tracking-tight">
            Buat akun Anda dan mulai melacak operasional.
          </h1>
          <p className="mt-4 animate-[slide-up_600ms_ease-out_220ms_both] text-sm leading-relaxed text-ink-300">
            Setiap transaksi menjadi satu catatan yang dapat dilacak: invoice, pembayaran, pengiriman, dokumen dan
            verifikasi dalam satu alur kerja.
          </p>
          <ul className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm text-ink-300">
            {[
              'Verifikasi yang deterministik dengan alasan yang jelas',
              'Dokumen dengan nama yang aman dan riwayat versi',
              'Antrean perhatian yang menampilkan hal-hal penting',
            ].map((item, i) => (
              <li
                key={item}
                className="flex animate-[slide-up_500ms_ease-out_both] items-center gap-2"
                style={{ animationDelay: `${320 + i * 90}ms` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative animate-[fade-in_800ms_ease-out_600ms_both] text-2xs text-ink-500">
          Prototipe independen, terinspirasi dari alur kerja PKL. Bukan sistem perusahaan sungguhan.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm animate-[slide-up_500ms_ease-out_both]">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800 lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke beranda
          </Link>

          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Buat akun</h2>
          <p className="mt-1 text-sm text-ink-500">Siapkan akses ke ruang kerja SAKHA Finance Operations.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {(
              [
                ['name', 'Nama lengkap', 100],
                ['email', 'Email', 170],
              ] as const
            ).map(([key, label, delay]) => (
              <div key={key} className="animate-[slide-up_500ms_ease-out_both]" style={{ animationDelay: `${delay}ms` }}>
                <TextInput
                  label={label}
                  type={key === 'email' ? 'email' : 'text'}
                  autoComplete={key === 'email' ? 'email' : 'name'}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  error={errors[key]}
                  required
                />
              </div>
            ))}
            <TextInput
              label="Kata Sandi"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              error={errors.password}
              hint="Minimal 8 karakter."
              required
            />
            <TextInput
              label="Konfirmasi kata sandi"
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)}
              error={errors.password_confirmation}
              required
            />
            <Select
              label="Peran"
              options={[
                { value: 'OPERATOR', label: 'Operator, membuat & memperbarui catatan operasional' },
                { value: 'REVIEWER', label: 'Peninjau, meninjau verifikasi & dokumen' },
              ]}
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              error={errors.role}
              hint="Akun Administrator diberikan oleh admin yang sudah ada."
            />

            <Button type="submit" variant="primary" className="group w-full" loading={submitting}>
              Buat akun
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </form>

          <p className="mt-6 animate-[fade-in_600ms_ease-out_460ms_both] text-center text-xs text-ink-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
