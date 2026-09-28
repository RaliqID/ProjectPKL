import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, FilterSelect, SearchInput } from '@/components/ui/Filters'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextInput, Select, Textarea } from '@/components/ui/Form'
import { useCustomers, useCreateCustomer } from '@/lib/hooks'
import { ApiError } from '@/lib/api'
import { useToast } from '@/lib/toast'
import type { Customer } from '@/types/api'

export function CustomersPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    page: Number(params.get('page') ?? 1),
    per_page: 15,
  }
  const { data, isLoading, error, refetch } = useCustomers(filters)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Pelanggan',
      render: (c) => (
        <div>
          <p className="max-w-[260px] truncate text-xs font-medium text-ink-800">{c.name}</p>
          <p className="text-2xs text-ink-400">{c.company_name ?? '—'}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Kode Pelanggan', render: (c) => <span className="font-mono text-2xs text-ink-500">{c.customer_code}</span> },
    { key: 'phone', header: 'Telepon', render: (c) => <span className="text-2xs text-ink-500">{c.phone ?? '—'}</span> },
    { key: 'email', header: 'Email', render: (c) => <span className="max-w-[200px] truncate text-2xs text-ink-500">{c.email ?? '—'}</span> },
    { key: 'transactions', header: 'Transaksi', align: 'right', render: (c) => <span className="tabular-nums text-xs text-ink-700">{c.transactions_count ?? 0}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge label={c.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'} tone={c.status === 'ACTIVE' ? 'success' : 'muted'} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Data master pelanggan dan aktivitas operasionalnya."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Tambah Pelanggan
          </Button>
        }
      />
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Cari nama, kode, email…" className="w-full sm:w-64" />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => update('status', v)}
          placeholder="Semua status"
          options={[
            { value: 'ACTIVE', label: 'Aktif' },
            { value: 'INACTIVE', label: 'Tidak Aktif' },
          ]}
        />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Tidak dapat memuat pelanggan.' : null}
            onRetry={() => refetch()}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/app/pelanggan/${c.id}`)}
            emptyTitle="Pelanggan tidak ditemukan"
            emptyDescription="Tambahkan pelanggan untuk mulai membuat transaksi."
            pagination={
              data?.meta
                ? { page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total, onPageChange: (p) => update('page', String(p)) }
                : undefined
            }
          />
        </div>
      </div>
      <CreateCustomerModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function CreateCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const create = useCreateCustomer()
  const [form, setForm] = useState({ name: '', company_name: '', phone: '', email: '', address: '', status: 'ACTIVE', notes: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setErrors({})
    try {
      await create.mutateAsync({ ...form })
      toast.success('Pelanggan dibuat', form.name)
      onClose()
      setForm({ name: '', company_name: '', phone: '', email: '', address: '', status: 'ACTIVE', notes: '' })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Tidak dapat membuat pelanggan', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Pelanggan"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Simpan Pelanggan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Nama" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Nama Perusahaan" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} error={errors.company_name} />
          <Select
            label="Status"
            options={[
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'INACTIVE', label: 'Tidak Aktif' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Telepon" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <TextInput label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>
        <Textarea label="Alamat" value={form.address} onChange={(e) => set('address', e.target.value)} />
        <Textarea label="Catatan" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}
