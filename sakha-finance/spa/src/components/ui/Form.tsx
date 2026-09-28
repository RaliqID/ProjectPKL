import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface FieldWrapperProps {
  label: string
  htmlFor?: string
  error?: string | string[]
  hint?: string
  required?: boolean
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, required, children }: FieldWrapperProps) {
  const message = Array.isArray(error) ? error[0] : error
  return (
    <div>
      <label className="df-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-bad-500">*</span> : null}
      </label>
      {children}
      {message ? (
        <p className="mt-1 text-xs text-bad-600" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | string[]
  hint?: string
}

export function TextInput({ label, error, hint, required, className, id, ...rest }: TextInputProps) {
  const inputId = id ?? `f-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        id={inputId}
        className={clsx('df-input', error && 'border-bad-300 focus:border-bad-400 focus:ring-bad-100', className)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string | string[]
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, hint, required, options, placeholder, className, id, ...rest }: SelectProps) {
  const selectId = id ?? `s-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={required}>
      <select
        id={selectId}
        className={clsx('df-input', error && 'border-bad-300 focus:border-bad-400 focus:ring-bad-100', className)}
        aria-invalid={Boolean(error)}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | string[]
  hint?: string
}

export function Textarea({ label, error, hint, required, className, id, ...rest }: TextareaProps) {
  const areaId = id ?? `t-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Field label={label} htmlFor={areaId} error={error} hint={hint} required={required}>
      <textarea
        id={areaId}
        className={clsx('df-input min-h-[80px] resize-y', error && 'border-bad-300', className)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  )
}
