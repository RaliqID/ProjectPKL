import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useSettings, useUpdateRequiredDocuments, useUpdateVerificationSettings, useUsers, useCreateUser, useUpdateUser } from '@/lib/hooks'
import { Modal } from '@/components/ui/Modal'
import { TextInput, Select } from '@/components/ui/Form'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/lib/toast'
import { useTheme } from '@/lib/theme'
import { ApiError, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import clsx from 'clsx'

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const initial = (params.get('tab') as SettingsTab) ?? 'documents'
  const [tab, setTab] = useState<SettingsTab>(initial)

  function switchTab(next: SettingsTab) {
    setTab(next)
    const p = new URLSearchParams(params)
    if (next === 'documents') p.delete('tab')
    else p.set('tab', next)
    setParams(p, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Pengaturan" description="Persyaratan dokumen, konfigurasi sistem, dan akses pengguna." />
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="-mb-px flex gap-1" aria-label="Bagian pengaturan">
          {(
            [
              { id: 'documents', label: 'Dokumen Wajib' },
              { id: 'system', label: 'Sistem' },
              { id: 'preferences', label: 'Preferensi' },
              { id: 'users', label: 'Pengguna & Peran' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={clsx(
                'border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                tab === t.id ? 'border-accent-600 text-accent-700' : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6 lg:p-8">
        {tab === 'documents' ? <RequiredDocumentsTab /> : null}
        {tab === 'system' ? <SystemTab /> : null}
        {tab === 'preferences' ? <PreferencesTab /> : null}
        {tab === 'users' ? <UsersTab /> : null}
      </div>
    </div>
  )
}

/**
 * Required documents, split into a loader and an editor.
 *
 * The previous version held the server's rules in `useState` and copied them in
 * with an effect that ran whenever `data` changed. That pattern has two costs:
 *
 *   - The copy can fall behind the source. After a save the query refetches, the
 *     effect runs again, and any edit made in between is silently discarded.
 *   - It renders twice on every load: once with empty rules, once with the real
 *     ones, so the table flashes.
 *
 * Deriving the initial value during render and remounting the editor with a
 * `key` removes both. React resets the state itself, and the reset point is
 * explicit rather than hidden in a dependency array.
 *
 * The API sends the rules and the list of document types as two separate arrays,
 * keyed differently (`document_type` versus `value`). They are joined here once,
 * so the editor receives a single shape and cannot mix the two up.
 */
function RequiredDocumentsTab() {
  const { data, isLoading, error, refetch } = useSettings()

  if (isLoading) return <Skeleton className="h-64" />

  if (error || !data) {
    return (
      <div className="df-card">
        <ErrorState message="Tidak dapat memuat pengaturan." onRetry={() => refetch()} />
      </div>
    )
  }

  const ruleByType = new Map(data.required_documents.map((r) => [r.document_type, r]))

  const rows = data.available_document_types.map((type) => {
    const rule = ruleByType.get(type.value)
    return {
      value: type.value,
      label: type.label,
      is_required: rule?.is_required ?? false,
      is_active: rule?.is_active ?? true,
    }
  })

  return (
    <RequiredDocumentsEditor
      // A new key whenever the server sends different values, so the editor
      // remounts with fresh initial state instead of copying them in.
      key={rows.map((r) => `${r.value}:${r.is_required}:${r.is_active}`).join('|')}
      rows={rows}
    />
  )
}

function RequiredDocumentsEditor({
  rows,
}: {
  rows: Array<{ value: string; label: string; is_required: boolean; is_active: boolean }>
}) {
  const update = useUpdateRequiredDocuments()
  const toast = useToast()

  // Seeded once, from props, at mount. The `key` above decides when that
  // happens; no effect is involved.
  const [rules, setRules] = useState<Record<string, { is_required: boolean; is_active: boolean }>>(
    () => Object.fromEntries(rows.map((r) => [r.value, { is_required: r.is_required, is_active: r.is_active }])),
  )

  const save = async () => {
    try {
      await update.mutateAsync({
        rules: Object.entries(rules).map(([document_type, v]) => ({ document_type, ...v })),
      })
      toast.success('Aturan dokumen wajib berhasil diperbarui')
    } catch (err) {
      toast.error('Tidak dapat menyimpan pengaturan', err instanceof ApiError ? err.message : undefined)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="df-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Dokumen Wajib</h2>
            <p className="mt-0.5 text-xs text-ink-500">Mesin verifikasi menggunakan aturan ini untuk menentukan dokumen mana yang harus ada.</p>
          </div>
          <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={update.isPending} onClick={save}>
            Simpan
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60">
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Jenis Dokumen</th>
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Aktif</th>
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Wajib</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => {
              const rule = rules[row.value] ?? { is_required: false, is_active: true }
              return (
                <tr key={row.value}>
                  <td className="px-5 py-3 text-xs text-ink-700">{row.label}</td>
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={(e) =>
                        setRules((r) => ({
                          ...r,
                          [row.value]: { ...rule, is_active: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-ink-300 text-accent-600"
                      aria-label={`${row.label} aktif`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={rule.is_required}
                      disabled={!rule.is_active}
                      onChange={(e) =>
                        setRules((r) => ({
                          ...r,
                          [row.value]: { ...rule, is_required: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-ink-300 text-accent-600 disabled:opacity-40"
                      aria-label={`${row.label} wajib`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SystemTab() {
  const { data, isLoading, error, refetch } = useSettings()
  if (isLoading) return <Skeleton className="h-40" />
  if (error || !data)
    return (
      <div className="df-card">
        <ErrorState message="Tidak dapat memuat pengaturan." onRetry={() => refetch()} />
      </div>
    )

  const sys = data.system

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Sistem</h2>
        </div>
        <dl className="divide-y divide-ink-100">
          <SysRow label="Aplikasi" value={sys.app_name} />
          <SysRow label="Zona Waktu" value={sys.timezone} />
          <SysRow label="Durasi Sesi" value={`${sys.session_lifetime} menit`} />
          <SysRow label="Ukuran unggah maksimum" value={`${sys.max_upload_mb} MB`} />
          <SysRow label="Jenis berkas yang diizinkan" value={sys.allowed_file_types.join(', ').toUpperCase()} />
        </dl>
      </div>

      <VerificationSettingsCard initial={data.verification} />

      <div className="df-card lg:col-span-2">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Peran</h2>
        </div>
        <ul className="divide-y divide-ink-100">
          {data.roles.map((role) => (
            <li key={role.value} className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <StatusBadge label={role.label} tone={role.value === 'ADMIN' ? 'info' : role.value === 'REVIEWER' ? 'warning' : 'neutral'} dot={false} />
                <span className="font-mono text-2xs text-ink-400">{role.value}</span>
              </div>
              <p className="mt-1.5 text-xs text-ink-600">{role.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Editable verification thresholds (admin only). */
function VerificationSettingsCard({
  initial,
}: {
  initial: { auto_review_threshold: number; min_score: number }
}) {
  const [threshold, setThreshold] = useState(String(initial.auto_review_threshold))
  const [minScore, setMinScore] = useState(String(initial.min_score))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateVerificationSettings()
  const toast = useToast()

  function save() {
    setErrors({})
    update.mutate(
      { auto_review_threshold: Number(threshold), min_score: Number(minScore) },
      {
        onSuccess: () => toast.success('Ambang verifikasi diperbarui.'),
        onError: (err: unknown) => {
          if (err instanceof ApiError) {
            setErrors(err.errors && Object.keys(err.errors).length ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])) : { general: err.message })
          } else {
            toast.error('Gagal menyimpan ambang verifikasi.')
          }
        },
      },
    )
  }

  return (
    <div className="df-card">
      <div className="border-b border-ink-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink-900">Verifikasi</h2>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-xs leading-relaxed text-ink-500">
          Atur seberapa ketat verifikasi otomatis. Perubahan berlaku pada pemeriksaan berikutnya.
        </p>
        <TextInput
          label="Ambang perlu ditinjau (jumlah temuan)"
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          error={errors.auto_review_threshold}
          hint="Transaksi masuk Perlu Ditinjau bila temuan mencapai angka ini."
        />
        <TextInput
          label="Skor minimum dapat diterima"
          type="number"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          error={errors.min_score}
          hint="Skor verifikasi di bawah nilai ini ditandai Perlu Diperiksa."
        />
        {errors.general ? <p className="text-xs text-bad-600">{errors.general}</p> : null}
        <Button variant="primary" onClick={save} disabled={update.isPending} loading={update.isPending}>
          <Save className="h-4 w-4" />
          Simpan
        </Button>
      </div>
    </div>
  )
}

function SysRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="text-right text-xs font-medium text-ink-800">{value}</dd>
    </div>
  )
}

function UsersTab() {
  const { user: currentUser } = useAuth()
  const { data, isLoading, error, refetch } = useUsers({ per_page: 50 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string; email: string; role: string; is_active: boolean } | null>(null)
  const updateUser = useUpdateUser()
  const toast = useToast()

  const toggleActive = async (row: { id: number; name: string; email: string; role: string; is_active: boolean }) => {
    try {
      await updateUser.mutateAsync({ id: row.id, is_active: !row.is_active })
      toast.success(`${row.name} ${row.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
    } catch (err) {
      toast.error('Tidak dapat memperbarui pengguna', err instanceof ApiError ? err.message : undefined)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
            <p className="text-xs text-ink-500">Kelola siapa yang dapat mengakses SAKHA Finance Operations dan pada tingkat akses apa.</p>
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          Pengguna Baru
        </Button>
      </div>
      <div className="df-card">
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : error || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/60">
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Pengguna</th>
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Peran</th>
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                <th className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide text-ink-500">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.data.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-ink-800">{row.name}</p>
                    <p className="text-2xs text-ink-400">{row.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge label={row.role_label} tone={row.role === 'ADMIN' ? 'info' : row.role === 'REVIEWER' ? 'warning' : 'neutral'} dot={false} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge label={row.is_active ? 'Aktif' : 'Tidak Aktif'} tone={row.is_active ? 'success' : 'muted'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-2xs"
                        onClick={() => {
                          setEditing(row)
                          setModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={row.is_active ? 'danger' : 'secondary'}
                        className="px-2 py-1 text-2xs"
                        disabled={row.id === currentUser?.id}
                        onClick={() => toggleActive(row)}
                        title={row.id === currentUser?.id ? 'Anda tidak dapat menonaktifkan akun sendiri' : undefined}
                      >
                        {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <UserModal
        /*
         * `key` remounts the modal whenever the target user changes, or the
         * modal is reopened. The form seeds itself from `editing` during render,
         * so the reset is React's own rather than an effect that has to notice
         * the change.
         *
         * The previous version reset via an effect keyed on `[editing, open]`.
         * It worked, but it rendered the empty form first and then the filled
         * one, so opening "Edit" on an existing user flashed a blank form.
         */
        key={editing ? `edit-${editing.id}` : `create-${modalOpen}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  )
}

function UserModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: { id: number; name: string; email: string; role: string; is_active: boolean } | null
}) {
  const toast = useToast()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  /**
   * Seeded during render, from the prop, at mount.
   *
   * The `key` on the caller decides when the modal is a fresh instance, which is
   * what makes this an initial value rather than a value that needs syncing.
   * `errors` keeps the same treatment, so reopening always starts clean.
   */
  const [form, setForm] = useState(() => ({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    // Never pre-filled: a password field that arrives populated invites an
    // accidental overwrite.
    password: '',
    role: editing?.role ?? 'OPERATOR',
    is_active: editing?.is_active ?? true,
  }))
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setErrors({})
    try {
      if (editing) {
        await updateUser.mutateAsync({
          id: editing.id,
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        })
        toast.success('Pengguna berhasil diperbarui')
      } else {
        await createUser.mutateAsync(form)
        toast.success('Pengguna berhasil dibuat')
      }
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Tidak dapat menyimpan pengguna', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Pengguna' : 'Pengguna Baru'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" loading={createUser.isPending || updateUser.isPending} onClick={submit}>
            {editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Nama" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextInput label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        <TextInput
          label={editing ? 'Kata sandi baru (biarkan kosong untuk mempertahankan)' : 'Kata Sandi'}
          type="password"
          required={!editing}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
        />
        <Select
          label="Peran"
          options={[
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'OPERATOR', label: 'Operator' },
            { value: 'REVIEWER', label: 'Pemeriksa' },
          ]}
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          error={errors.role}
        />
        <label className="flex items-center gap-2 text-xs text-ink-600">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600"
          />
          Aktif
        </label>
      </div>
    </Modal>
  )
}


/* --------------------------------------------------------- Preferensi ---- */

type SettingsTab = 'documents' | 'system' | 'preferences' | 'users'

/**
 * User-level preferences. Currently just the theme; stored per account so the
 * choice follows the user across devices.
 */
function PreferencesTab() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const [emailOn, setEmailOn] = useState(user?.email_notifications ?? true)
  const [saving, setSaving] = useState(false)

  const options: { value: 'light' | 'dark' | 'system'; label: string; desc: string }[] = [
    { value: 'light', label: 'Terang', desc: 'Latar putih. Berlaku di seluruh halaman.' },
    { value: 'dark', label: 'Gelap', desc: 'Latar gelap, nyaman untuk penggunaan lama / malam.' },
    { value: 'system', label: 'Ikut Sistem', desc: 'Mengikuti pengaturan tema perangkat Anda.' },
  ]

  async function toggleEmail(next: boolean) {
    setEmailOn(next)
    setSaving(true)
    try {
      await api.put('/api/me/preferences', { email_notifications: next })
      toast.success('Preferensi notifikasi disimpan.')
    } catch {
      setEmailOn(!next)
      toast.error('Gagal menyimpan preferensi notifikasi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Tampilan</h2>
          <p className="mt-0.5 text-2xs text-ink-400">Pilihan tema berlaku di seluruh halaman dan tersimpan pada akun Anda.</p>
        </div>
        <div className="divide-y divide-ink-100">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-ink-50"
            >
              <input
                type="radio"
                name="theme"
                checked={theme === opt.value}
                onChange={() => setTheme(opt.value)}
                className="mt-0.5 h-4 w-4 border-ink-300 text-accent-600 focus:ring-accent-200"
              />
              <span>
                <span className="block text-sm font-medium text-ink-800">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-ink-500">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Notifikasi</h2>
          <p className="mt-0.5 text-2xs text-ink-400">Notifikasi dalam aplikasi selalu aktif; email dapat dimatikan.</p>
        </div>
        <label className="flex cursor-pointer items-center justify-between px-5 py-4">
          <span>
            <span className="block text-sm font-medium text-ink-800">Kirim notifikasi melalui email</span>
            <span className="mt-0.5 block text-xs text-ink-500">
              Ringkasan temuan verifikasi, invoice jatuh tempo, dan dokumen kurang.
            </span>
          </span>
          <input
            type="checkbox"
            checked={emailOn}
            disabled={saving}
            onChange={(e) => toggleEmail(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-200"
          />
        </label>
      </div>
    </div>
  )
}