import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

/** Search input with a leading icon; controlled by the parent. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="df-input pl-9"
        aria-label={placeholder}
      />
    </div>
  )
}

/** Horizontal filter bar that wraps its children. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-2 border-b border-ink-200 bg-white px-6 py-3 lg:px-8', className)}>
      {children}
    </div>
  )
}

/** Compact select used inside filter bars. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  label: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="df-input w-auto min-w-[150px] py-1.5 text-xs"
      aria-label={label}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/** Small date input matching the filter bar styling. */
export function FilterDate({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="df-input w-auto py-1.5 text-xs"
      aria-label={label}
    />
  )
}
