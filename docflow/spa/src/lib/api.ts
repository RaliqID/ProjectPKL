/**
 * Thin API client around fetch.
 *
 * Session auth: the SPA is served from the same origin as the API in production,
 * so the Laravel session cookie is sent automatically. We request a CSRF cookie
 * once on boot, then echo it in the X-XSRF-TOKEN header for state-changing calls.
 *
 * Every failure is normalised into an ApiError carrying the server's user-facing
 * message and per-field errors, so forms can show them inline.
 */

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
    /**
     * The failure that caused this one, when there was one.
     *
     * A network error has no status to inspect, so the original rejection is the
     * only clue about what actually went wrong. Kept rather than swallowed.
     */
    options?: { cause?: unknown },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors

    /*
     * `Error.cause` is assigned rather than passed to `super`.
     *
     * The two-argument `Error` constructor needs a lib target that this project
     * does not set, and the assignment is equivalent at runtime on every engine
     * that supports `cause` at all. The property is declared on the class so the
     * type is available regardless of lib.
     */
    if (options?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

let csrfReady: Promise<void> | null = null

/**
 * Ensure an XSRF cookie exists.
 *
 * IMPORTANT: once we already hold an XSRF-TOKEN cookie (or we are authenticated),
 * we must NOT call /sanctum/csrf-cookie again — that endpoint mints a brand-new
 * guest session, which would discard the session that just authenticated us and
 * log the user out on the next navigation.
 */
export async function ensureCsrf(): Promise<void> {
  if (readCookie('XSRF-TOKEN')) return
  if (csrfReady) return csrfReady
  csrfReady = fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' })
    .then(() => undefined)
    .catch(() => {
      // Non-fatal: the XSRF cookie may already be present via another path.
    })
  return csrfReady
}

/** Forget the cached CSRF promise (used after logout). */
export function resetCsrf(): void {
  csrfReady = null
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (method !== 'GET' && method !== 'HEAD') {
    await ensureCsrf()
    const token = readCookie('XSRF-TOKEN')
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body:
        body === undefined || method === 'GET' || method === 'HEAD'
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    })
  } catch (cause) {
    // The underlying failure is carried on the error rather than discarded:
    // `fetch` rejects for DNS problems, refused connections, aborted requests
    // and CORS, and those need different responses. Without the cause they are
    // indistinguishable in a log.
    throw new ApiError(0, 'Network error. Please check your connection and try again.', {}, { cause })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && String(payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Request failed (${response.status})`
    const errors =
      payload && typeof payload === 'object' && 'errors' in payload
        ? ((payload.errors as Record<string, string[]>) ?? {})
        : {}
    throw new ApiError(response.status, message, errors)
  }

  return payload as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
}

/** Build a query string from a filter object, skipping empty values. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
