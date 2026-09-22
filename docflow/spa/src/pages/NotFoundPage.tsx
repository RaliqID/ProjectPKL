import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-2xs uppercase tracking-widest text-ink-400">Error 404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Back to Overview</Button>
      </Link>
    </div>
  )
}
