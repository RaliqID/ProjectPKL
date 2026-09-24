import { useState } from 'react'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useSettings, useUpdateRequiredDocuments, useUsers, useCreateUser, useUpdateUser } from '@/lib/hooks'
import { Modal } from '@/components/ui/Modal'
import { TextInput, Select } from '@/components/ui/Form'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/lib/toast'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import clsx from 'clsx'

export function SettingsPage() {
  const [tab, setTab] = useState<'documents' | 'system' | 'users'>('documents')

  return (
    <div>
      <PageHeader title="Settings" description="Document requirements, system configuration and user access." />
      <div className="border-b border-ink-200 bg-white px-6 lg:px-8">
        <nav className="-mb-px flex gap-1" aria-label="Settings sections">
          {(
            [
              { id: 'documents', label: 'Required Documents' },
              { id: 'system', label: 'System' },
              { id: 'users', label: 'Users & Roles' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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
        <ErrorState message="Could not load settings." onRetry={() => refetch()} />
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
      toast.success('Required document rules updated')
    } catch (err) {
      toast.error('Could not save settings', err instanceof ApiError ? err.message : undefined)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="df-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Required Documents</h2>
            <p className="mt-0.5 text-xs text-ink-500">The verification engine uses these rules to decide which documents must exist.</p>
          </div>
          <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={update.isPending} onClick={save}>
            Save
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60">
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Document Type</th>
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Active</th>
              <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Required</th>
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
                      aria-label={`${row.label} active`}
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
                      aria-label={`${row.label} required`}
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
        <ErrorState message="Could not load settings." onRetry={() => refetch()} />
      </div>
    )

  const sys = data.system

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">System</h2>
        </div>
        <dl className="divide-y divide-ink-100">
          <SysRow label="Application" value={sys.app_name} />
          <SysRow label="Timezone" value={sys.timezone} />
          <SysRow label="Session lifetime" value={`${sys.session_lifetime} minutes`} />
          <SysRow label="Max upload" value={`${sys.max_upload_mb} MB`} />
          <SysRow label="Allowed file types" value={sys.allowed_file_types.join(', ').toUpperCase()} />
        </dl>
      </div>
      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Roles</h2>
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
      toast.success(`${row.name} ${row.is_active ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error('Could not update user', err instanceof ApiError ? err.message : undefined)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">Manage who can access DOCFLOW and at what level.</p>
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          New User
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
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">User</th>
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Role</th>
                <th className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                <th className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide text-ink-500">Actions</th>
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
                    <StatusBadge label={row.is_active ? 'Active' : 'Inactive'} tone={row.is_active ? 'success' : 'muted'} />
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
                        title={row.id === currentUser?.id ? 'You cannot deactivate your own account' : undefined}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
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
        toast.success('User updated')
      } else {
        await createUser.mutateAsync(form)
        toast.success('User created')
      }
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not save user', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit User' : 'New User'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={createUser.isPending || updateUser.isPending} onClick={submit}>
            {editing ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Name" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextInput label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        <TextInput
          label={editing ? 'New password (leave blank to keep)' : 'Password'}
          type="password"
          required={!editing}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
        />
        <Select
          label="Role"
          options={[
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'OPERATOR', label: 'Operator' },
            { value: 'REVIEWER', label: 'Reviewer' },
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
          Active
        </label>
      </div>
    </Modal>
  )
}
