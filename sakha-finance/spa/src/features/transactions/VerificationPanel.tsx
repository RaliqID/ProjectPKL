import { RefreshCw } from 'lucide-react'
import type { VerificationRun } from '@/types/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { metaFor, VERIFICATION_STATUS } from '@/lib/status'
import { formatDateTime } from '@/lib/format'
import clsx from 'clsx'

export function VerificationPanel({
  verification,
  canRun,
  onRun,
  running,
}: {
  verification: VerificationRun | null
  canRun: boolean
  onRun: () => void
  running: boolean
  transactionId: number
}) {
  if (!verification) {
    return (
      <div className="df-card">
        <EmptyState
          title="Verifikasi belum dijalankan"
          description="Jalankan verifikasi untuk memeriksa dokumen yang wajib, nilai invoice, saldo pembayaran, pelacakan pengiriman, dan lainnya."
          action={
            canRun ? (
              <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={onRun} loading={running}>
                Jalankan Verifikasi
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  const overallMeta = metaFor(VERIFICATION_STATUS, verification.overall_status)

  return (
    <div className="space-y-6">
      <div className="df-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-ink-900">Hasil Verifikasi</p>
              <StatusBadge label={overallMeta.label} tone={overallMeta.tone} />
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Dijalankan {formatDateTime(verification.created_at)}
              {verification.runner_name ? ` oleh ${verification.runner_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-xs">
              <CountStat label="Sesuai" value={verification.pass_count} tone="ok" />
              <CountStat label="Perlu Diperiksa" value={verification.warning_count} tone="warn" />
              <CountStat label="Tidak Sesuai" value={verification.failed_count} tone="bad" />
            </div>
            <div className="text-right">
              <p className="text-2xs uppercase tracking-wide text-ink-400">Skor</p>
              <p className="text-xl font-semibold tabular-nums text-ink-900">{verification.score}</p>
            </div>
            {canRun ? (
              <Button icon={<RefreshCw className="h-4 w-4" />} onClick={onRun} loading={running}>
                Jalankan Ulang
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="df-card">
        <div className="border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-900">Pemeriksaan</h2>
        </div>
        <ul className="divide-y divide-ink-100">
          {(verification.checks ?? []).map((check) => {
            const meta = metaFor(VERIFICATION_STATUS, check.status)
            return (
              <li key={check.id} className="flex items-start gap-4 px-5 py-4">
                <StatusBadge label={meta.label} tone={meta.tone} className="mt-0.5 w-20 justify-center" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-800">{check.rule_label}</p>
                  <p className="mt-0.5 text-xs text-ink-600">{check.message}</p>
                  {check.metadata && Object.keys(check.metadata).length > 0 ? (
                    <MetadataList metadata={check.metadata} />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function MetadataList({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null

  return (
    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-1.5 text-2xs">
          <dt className="text-ink-400">{key.replace(/_/g, ' ')}:</dt>
          <dd className="font-mono text-ink-600">{formatMetaValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatMetaValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}

function CountStat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'bad' }) {
  const colors = {
    ok: 'text-ok-700',
    warn: 'text-warn-700',
    bad: 'text-bad-700',
  }
  return (
    <div className="text-center">
      <p className={clsx('text-base font-semibold tabular-nums', colors[tone])}>{value}</p>
      <p className="text-2xs text-ink-400">{label}</p>
    </div>
  )
}
