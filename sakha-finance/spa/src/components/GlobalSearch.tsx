import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { reportQuietly } from '@/lib/report'
import type { SearchResult } from '@/types/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { metaFor, TRANSACTION_STATUS } from '@/lib/status'

export function GlobalSearch() {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) {
      setResults([])
      return
    }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.get<{ data: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`)
        if (active) setResults(data.data)
      } catch (error) {
        // Showing no results is the right behaviour for a search box, but the
        // cause is recorded so a broken endpoint is not mistaken for "no match".
        reportQuietly('search', error)
        if (active) setResults([])
      } finally {
        if (active) setLoading(false)
      }
    }, 220)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [term])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const go = (result: SearchResult) => {
    setOpen(false)
    setTerm('')
    navigate(`/transactions/${result.transaction_id}`)
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari transaksi, pelanggan, invoice, resi…"
        className="df-input py-1.5 pl-9 pr-16 text-xs"
        aria-label="Pencarian global"
      />
      {term ? (
        <button
          type="button"
          onClick={() => setTerm('')}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-600"
          aria-label="Hapus pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-2xs text-ink-400 sm:block">
        /
      </kbd>

      {open && term.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-pop animate-slide-up">
          {loading ? (
            <div className="px-3 py-3 text-xs text-ink-400">Mencari…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink-400">Tidak ada hasil untuk “{term}”.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.entity_type}-${result.transaction_id}-${result.label}`}>
                  <button
                    type="button"
                    onClick={() => go(result)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ink-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium text-ink-800">{result.label}</p>
                      <p className="truncate text-2xs text-ink-400">
                        {result.match_type}
                        {result.customer ? ` · ${result.customer}` : ''}
                      </p>
                    </div>
                    <StatusBadge
                      label={metaFor(TRANSACTION_STATUS, result.status).label}
                      tone={metaFor(TRANSACTION_STATUS, result.status).tone}
                      dot={false}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
