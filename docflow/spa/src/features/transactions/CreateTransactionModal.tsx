import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextInput, Select, Textarea } from '@/components/ui/Form'
import { useCreateTransaction, useCustomers } from '@/lib/hooks'
import { ApiError } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { formatIDR } from '@/lib/format'
import clsx from 'clsx'

const STEPS = ['Customer', 'Transaction', 'Financial', 'Review']

export function CreateTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateTransaction()
  const { data: customers } = useCustomers({ per_page: 100, status: 'ACTIVE' })

  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({
    customer_id: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    purchase_order_number: '',
    reference_number: '',
    notes: '',
    subtotal: '',
    discount: '0',
    tax: '0',
  })

  const total = useMemo(() => {
    const sub = Number(form.subtotal || 0)
    const disc = Number(form.discount || 0)
    const tax = Number(form.tax || 0)
    return Math.max(sub - disc + tax, 0)
  }, [form.subtotal, form.discount, form.tax])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const customerOptions = (customers?.data ?? []).map((c) => ({
    value: String(c.id),
    label: `${c.name} (${c.customer_code})`,
  }))

  const reset = () => {
    setStep(0)
    setErrors({})
    setForm({
      customer_id: '',
      transaction_date: new Date().toISOString().slice(0, 10),
      purchase_order_number: '',
      reference_number: '',
      notes: '',
      subtotal: '',
      discount: '0',
      tax: '0',
    })
  }

  const close = () => {
    reset()
    onClose()
  }

  const canNext = () => {
    if (step === 0) return Boolean(form.customer_id)
    if (step === 1) return Boolean(form.transaction_date)
    if (step === 2) return Number(form.subtotal) > 0
    return true
  }

  const submit = async () => {
    setErrors({})
    try {
      const result = await create.mutateAsync({
        customer_id: Number(form.customer_id),
        transaction_date: form.transaction_date,
        purchase_order_number: form.purchase_order_number || null,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        subtotal: Number(form.subtotal),
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
      })
      toast.success('Transaction created', result.data.transaction_code)
      close()
      navigate(`/transactions/${result.data.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {})
        toast.error('Could not create transaction', error.message)
      } else {
        toast.error('Could not create transaction')
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Transaction"
      description="Totals are recalculated on the server; the preview is indicative only."
      size="lg"
      footer={
        <>
          {step > 0 ? (
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button variant="primary" icon={<Check className="h-4 w-4" />} loading={create.isPending} onClick={submit}>
              Create Transaction
            </Button>
          )}
        </>
      }
    >
      <Stepper step={step} />

      <div className="mt-5 space-y-4">
        {step === 0 ? (
          <Select
            label="Customer"
            required
            placeholder="Select a customer…"
            options={customerOptions}
            value={form.customer_id}
            onChange={(e) => set('customer_id', e.target.value)}
            error={errors.customer_id}
          />
        ) : null}

        {step === 1 ? (
          <>
            <TextInput
              label="Transaction date"
              type="date"
              required
              value={form.transaction_date}
              onChange={(e) => set('transaction_date', e.target.value)}
              error={errors.transaction_date}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Purchase order number"
                value={form.purchase_order_number}
                onChange={(e) => set('purchase_order_number', e.target.value)}
                error={errors.purchase_order_number}
                placeholder="PO-…"
              />
              <TextInput
                label="Reference number"
                value={form.reference_number}
                onChange={(e) => set('reference_number', e.target.value)}
                error={errors.reference_number}
                placeholder="REF-…"
              />
            </div>
            <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <TextInput
                label="Subtotal"
                type="number"
                min={0}
                required
                value={form.subtotal}
                onChange={(e) => set('subtotal', e.target.value)}
                error={errors.subtotal}
                placeholder="0"
              />
              <TextInput
                label="Discount"
                type="number"
                min={0}
                value={form.discount}
                onChange={(e) => set('discount', e.target.value)}
                error={errors.discount}
              />
              <TextInput
                label="Tax"
                type="number"
                min={0}
                value={form.tax}
                onChange={(e) => set('tax', e.target.value)}
                error={errors.tax}
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm">
              <span className="text-ink-500">Calculated total</span>
              <span className="ml-2 font-semibold tabular-nums text-ink-900">{formatIDR(total)}</span>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <dl className="divide-y divide-ink-100 rounded-md border border-ink-200">
            <ReviewRow label="Customer" value={customerOptions.find((c) => c.value === form.customer_id)?.label ?? '—'} />
            <ReviewRow label="Date" value={form.transaction_date} />
            <ReviewRow label="PO number" value={form.purchase_order_number || '—'} />
            <ReviewRow label="Reference" value={form.reference_number || '—'} />
            <ReviewRow label="Subtotal" value={formatIDR(form.subtotal || 0)} />
            <ReviewRow label="Discount" value={formatIDR(form.discount || 0)} />
            <ReviewRow label="Tax" value={formatIDR(form.tax || 0)} />
            <ReviewRow label="Total" value={formatIDR(total)} strong />
          </dl>
        ) : null}
      </div>
    </Modal>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            className={clsx(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
              i < step && 'bg-accent-600 text-white',
              i === step && 'bg-accent-100 text-accent-700 ring-1 ring-accent-300',
              i > step && 'bg-ink-100 text-ink-400',
            )}
          >
            {i < step ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={clsx('text-2xs font-medium', i === step ? 'text-ink-800' : 'text-ink-400')}>{label}</span>
          {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-ink-200" /> : null}
        </li>
      ))}
    </ol>
  )
}

function ReviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={clsx('text-sm tabular-nums', strong ? 'font-semibold text-ink-900' : 'text-ink-700')}>{value}</dd>
    </div>
  )
}
