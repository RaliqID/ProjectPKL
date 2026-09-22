import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { ErrorState, EmptyState, TableSkeleton } from './States'

export interface Column<T> {
  key: string
  header: string
  className?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  sort?: { key: string; direction: 'asc' | 'desc' }
  onSortChange?: (key: string) => void
  pagination?: {
    page: number
    lastPage: number
    total: number
    onPageChange: (page: number) => void
  }
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle = 'No results',
  emptyDescription,
  emptyAction,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  pagination,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton rows={8} cols={Math.min(columns.length, 6)} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    'whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-500',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    !col.align && 'text-left',
                    col.className,
                  )}
                >
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className={clsx(
                        'inline-flex items-center gap-1 hover:text-ink-800',
                        sort?.key === col.key && 'text-ink-900',
                      )}
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        <span className="text-2xs">{sort.direction === 'asc' ? '▲' : '▼'}</span>
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'link' : undefined}
                aria-label={onRowClick ? `Open ${rowKey(row)}` : undefined}
                className={clsx(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-ink-50 focus-visible:bg-ink-50',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-4 py-3 align-middle text-ink-700',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.lastPage > 1 ? (
        <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
          <p className="text-xs text-ink-500">
            Page {pagination.page} of {pagination.lastPage} · {pagination.total} records
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              className="px-2 py-1.5"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="px-2 py-1.5"
              disabled={pagination.page >= pagination.lastPage}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
