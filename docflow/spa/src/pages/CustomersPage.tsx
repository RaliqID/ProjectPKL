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
      header: 'Customer',
      render: (c) => (
        <div>
          <p className="max-w-[260px] truncate text-xs font-medium text-ink-800">{c.name}</p>
          <p className="text-2xs text-ink-400">{c.company_name ?? '—'}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Code', render: (c) => <span className="font-mono text-2xs text-ink-500">{c.customer_code}</span> },
    { key: 'phone', header: 'Phone', render: (c) => <span className="text-2xs text-ink-500">{c.phone ?? '—'}</span> },
    { key: 'email', header: 'Email', render: (c) => <span className="max-w-[200px] truncate text-2xs text-ink-500">{c.email ?? '—'}</span> },
    { key: 'transactions', header: 'Transactions', align: 'right', render: (c) => <span className="tabular-nums text-xs text-ink-700">{c.transactions_count ?? 0}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge label={c.status === 'ACTIVE' ? 'Active' : 'Inactive'} tone={c.status === 'ACTIVE' ? 'success' : 'muted'} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer master data and their operational activity."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New Customer
          </Button>
        }
      />
      <FilterBar>
        <SearchInput value={filters.q} onChange={(v) => update('q', v)} placeholder="Search name, code, email…" className="w-full sm:w-64" />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => update('status', v)}
          placeholder="All statuses"
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
        />
      </FilterBar>
      <div className="p-6 lg:p-8">
        <div className="df-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            error={error ? 'Could not load customers.' : null}
            onRetry={() => refetch()}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/customers/${c.id}`)}
            emptyTitle="No customers found"
            emptyDescription="Add a customer to start creating transactions."
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
      toast.success('Customer created', form.name)
      onClose()
      setForm({ name: '', company_name: '', phone: '', email: '', address: '', status: 'ACTIVE', notes: '' })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not create customer', error.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Customer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            Create Customer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Name" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Company name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} error={errors.company_name} />
          <Select
            label="Status"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <TextInput label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>
        <Textarea label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}
