import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Form'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('operator@docflow.test')
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
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await login(email.trim(), password, remember)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { email: [error.message] })
      } else {
        setErrors({ email: ['Unable to sign in. Please try again.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-ink-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-500 text-sm font-bold">DF</div>
          <span className="text-sm font-semibold tracking-tight">DOCFLOW</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight">
            One transaction, one source of operational context.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            Connect transactions, invoices, payments, deliveries, documents and verification into a single
            traceable workflow — so nothing gets lost between marketplace, spreadsheet, and chat.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs text-ink-400">
            <div>
              <p className="font-medium text-white">Organize</p>
              <p className="mt-1">Documents & transactions in one place.</p>
            </div>
            <div>
              <p className="font-medium text-white">Verify</p>
              <p className="mt-1">Deterministic checks with clear reasons.</p>
            </div>
            <div>
              <p className="font-medium text-white">Track</p>
              <p className="mt-1">Status and history that stay auditable.</p>
            </div>
          </div>
        </div>
        <p className="text-2xs text-ink-500">
          Independent prototype — inspired by an internship workflow. Not a real company system.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-600 text-sm font-bold text-white">
              DF
            </div>
            <span className="text-sm font-semibold tracking-tight text-ink-900">DOCFLOW</span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Use a demo account to explore the workspace.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <TextInput
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />
            <TextInput
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />

            <label className="flex items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600 focus:ring-accent-200"
              />
              Remember this session
            </label>

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
              <LockKeyhole className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              Demo accounts
            </div>
            <ul className="mt-2 space-y-1 font-mono text-2xs text-ink-500">
              <li>admin@docflow.test · password</li>
              <li>operator@docflow.test · password</li>
              <li>reviewer@docflow.test · password</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
