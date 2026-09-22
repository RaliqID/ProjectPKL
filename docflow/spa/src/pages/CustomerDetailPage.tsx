import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useCustomer } from '@/lib/hooks'
import { formatDate, formatIDR } from '@/lib/format'
import { metaFor, TRANSACTION_STATUS } from '@/lib/status'

export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useCustomer(id)

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid grid-cols-3 gap-6">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="df-card">
          <ErrorState message="Could not load this customer." onRetry={() => refetch()} />
        </div>
      </div>
    )
  }

  const { customer, outstanding_amount, recent_transactions } = data

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/customers" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800">
            <ArrowLeft className="h-3.5 w-3.5" />
            All customers
          </Link>
        }
        title={customer.name}
        description={customer.company_name ?? undefined}
        actions={
          <StatusBadge
            label={customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            tone={customer.status === 'ACTIVE' ? 'success' : 'muted'}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3 lg:p-8">
        <div className="df-card lg:col-span-2">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">Recent Transactions</h2>
          </div>
          {recent_transactions.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-ink-400">No transactions for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent_transactions.map((t) => {
                const meta = metaFor(TRANSACTION_STATUS, t.status)
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/transactions/${t.id}`)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-ink-50"
                    >
                      <div>
                        <p className="font-mono text-xs font-medium text-ink-800">{t.transaction_code}</p>
                        <p className="text-2xs text-ink-400">{formatDate(t.transaction_date)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium tabular-nums text-ink-700">{formatIDR(t.total_amount)}</span>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="df-card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Profile</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Customer code" value={customer.customer_code} mono />
              <Row label="Phone" value={customer.phone ?? '—'} />
              <Row label="Email" value={customer.email ?? '—'} />
              <Row label="Transactions" value={String(customer.transactions_count ?? 0)} />
              <Row label="Outstanding" value={formatIDR(outstanding_amount)} strong={Number(outstanding_amount) > 0} />
            </dl>
            {customer.address ? (
              <div className="mt-4 border-t border-ink-100 pt-4">
                <p className="text-2xs uppercase tracking-wide text-ink-400">Address</p>
                <p className="mt-1 text-xs text-ink-600">{customer.address}</p>
              </div>
            ) : null}
          </div>
          {customer.notes ? (
            <div className="df-card p-5">
              <h2 className="text-sm font-semibold text-ink-900">Notes</h2>
              <p className="mt-2 text-xs text-ink-600">{customer.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={`text-right text-xs ${mono ? 'font-mono' : ''} ${strong ? 'font-semibold text-warn-700' : 'text-ink-800'}`}>{value}</dd>
    </div>
  )
}
