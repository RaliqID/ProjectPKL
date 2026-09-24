/**
 * Failure reporting.
 *
 * One place decides what is logged and what the user is told.
 *
 * The problem this solves: `catch { toast.error('Could not save') }` reads as
 * handled, but the cause is gone. Nothing is recorded, so a report of "it didn't
 * work" cannot be investigated. Four call sites in this app did exactly that.
 *
 * The rules:
 *
 *   - The cause is always logged, with context naming the operation.
 *   - The user always gets the server's own message when there is one. Laravel
 *     already returns a sentence that makes sense; replacing it with "Something
 *     went wrong" throws away the most useful thing available.
 *   - `ApiError` is expected. Anything else is a bug, and is logged louder.
 */

import { ApiError } from './api'

export type ToastKind = 'success' | 'error' | 'info'

/**
 * The shape this module needs from a toast library.
 *
 * Declared structurally so `report.ts` does not import the toast context and
 * cannot become a circular dependency.
 */
export type Toaster = {
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  success: (title: string, description?: string) => void
}

/**
 * A short, stable label for where a failure happened.
 *
 * Logged alongside the error so a console line is attributable without a stack.
 */
function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'network'
    if (error.status === 401 || error.status === 403) return `auth(${error.status})`
    if (error.status === 422) return 'validation'
    if (error.status >= 500) return `server(${error.status})`
    return `http(${error.status})`
  }
  if (error instanceof Error) return error.name
  return typeof error
}

/**
 * Reports a failed operation and shows the user the best message available.
 *
 * @param operation  What was being attempted, e.g. "run verification".
 * @param error      The caught value.
 * @param toast      The toast API, so the caller's context decides presentation.
 * @param fallback   Wording to use when the server gave none.
 */
export function reportFailure(
  operation: string,
  error: unknown,
  toast: Toaster,
  fallback: string,
): void {
  const kind = describe(error)

  // The cause, always. `console.error` so it survives a production build's log
  // level; `console.warn` would be stripped by many setups.
  console.error(`[docflow] ${operation} failed (${kind})`, error)

  // Prefer the server's message. It is written for a person and usually says
  // something the fallback cannot, such as which field was rejected.
  const detail =
    error instanceof ApiError && error.message && error.message !== fallback
      ? error.message
      : undefined

  toast.error(fallback, detail)
}

/**
 * Reports a failure that is not worth interrupting the user for.
 *
 * Used where the operation is a background refresh: a stale list is a small
 * problem, and a toast on every failed poll trains people to dismiss toasts.
 * The cause is still logged.
 */
export function reportQuietly(operation: string, error: unknown): void {
  console.error(`[docflow] ${operation} failed (${describe(error)})`, error)
}
