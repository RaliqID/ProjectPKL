import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { TextInput, Select } from '@/components/ui/Form'
import { Logo } from '@/components/Logo'

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
        setErrors({ email: ['Unable to create your account. Please try again.'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-ink-900 p-10 text-white lg:flex">
        <Logo to="/" variant="light" size="md" />
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight">
            Create your account and start tracking operations.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            Every transaction becomes one traceable record: invoice, payment, delivery, documents and
            verification in a single workflow.
          </p>
          <ul className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm text-ink-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Deterministic verification with clear reasons
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Documents with safe names and version history
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              An attention queue that surfaces what matters
            </li>
          </ul>
        </div>
        <p className="text-2xs text-ink-500">
          Independent prototype — inspired by an internship workflow. Not a real company system.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800 lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Create an account</h2>
          <p className="mt-1 text-sm text-ink-500">Set up access to the DOCFLOW workspace.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <TextInput
              label="Full name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
              required
            />
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={errors.email}
              required
            />
            <TextInput
              label="Password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              error={errors.password}
              hint="At least 8 characters."
              required
            />
            <TextInput
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)}
              error={errors.password_confirmation}
              required
            />
            <Select
              label="Role"
              options={[
                { value: 'OPERATOR', label: 'Operator — create & update operational records' },
                { value: 'REVIEWER', label: 'Reviewer — review verification & documents' },
              ]}
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              error={errors.role}
              hint="Administrator accounts are granted by an existing admin."
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
