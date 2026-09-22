import { useState } from 'react'
import { Download, Eye, FileText, Plus, ShieldCheck, ShieldX, Archive } from 'lucide-react'
import type { Document } from '@/types/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Form'
import { metaFor, DOCUMENT_STATUS } from '@/lib/status'
import { formatDateTime } from '@/lib/format'
import { useDocumentAction } from '@/lib/hooks'
import { useToast } from '@/lib/toast'
import { ApiError } from '@/lib/api'

/** Trigger an authenticated download (session cookie rides along). */
function downloadDocument(id: number, filename: string) {
  const a = document.createElement('a')
  a.href = `/api/documents/${id}/download`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function DocumentList({
  documents,
  canWrite,
  canReview,
  onAdded,
}: {
  documents: Document[]
  canWrite: boolean
  canReview: boolean
  onAdded: () => void
}) {
  const [preview, setPreview] = useState<Document | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Document | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const action = useDocumentAction()
  const toast = useToast()

  const run = async (doc: Document, act: 'verify' | 'archive', reason?: string) => {
    try {
      await action.mutateAsync({ id: doc.id, action: act, reason })
      toast.success(`Document ${act === 'verify' ? 'verified' : 'archived'}`)
    } catch (error) {
      toast.error('Could not update document', error instanceof ApiError ? error.message : undefined)
    }
  }

  const doReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast.error('Reason is required')
      return
    }
    try {
      await action.mutateAsync({ id: rejectTarget.id, action: 'reject', reason: rejectReason })
      toast.success('Document rejected')
      setRejectTarget(null)
      setRejectReason('')
    } catch (error) {
      toast.error('Could not reject document', error instanceof ApiError ? error.message : undefined)
    }
  }

  return (
    <div className="df-card">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink-900">Documents</h2>
        {canWrite ? (
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onAdded}>
            Add Document
          </Button>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents uploaded"
          description="Upload the invoice, delivery order and payment proof so verification can confirm the workflow."
          icon={<FileText className="h-5 w-5" />}
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {documents.map((doc) => {
            const meta = metaFor(DOCUMENT_STATUS, doc.status)
            return (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink-800">{doc.original_filename}</p>
                    <p className="mt-0.5 text-2xs text-ink-400">
                      {doc.document_type_label} · {doc.file_size_label} · v{doc.current_version}
                      {doc.document_number ? ` · ${doc.document_number}` : ''}
                    </p>
                    <p className="mt-0.5 text-2xs text-ink-400">
                      Uploaded {formatDateTime(doc.uploaded_at)}
                      {doc.uploader_name ? ` by ${doc.uploader_name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge label={meta.label} tone={meta.tone} />
                  <Button variant="ghost" className="px-2 py-1.5" onClick={() => setPreview(doc)} aria-label="Preview document">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1.5"
                    onClick={() => downloadDocument(doc.id, doc.original_filename)}
                    aria-label="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canReview && doc.status !== 'VERIFIED' ? (
                    <Button variant="ghost" className="px-2 py-1.5" onClick={() => run(doc, 'verify')} aria-label="Verify document">
                      <ShieldCheck className="h-4 w-4 text-ok-600" />
                    </Button>
                  ) : null}
                  {canReview && doc.status !== 'REJECTED' ? (
                    <Button variant="ghost" className="px-2 py-1.5" onClick={() => setRejectTarget(doc)} aria-label="Reject document">
                      <ShieldX className="h-4 w-4 text-bad-600" />
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Preview modal: PDF via <embed>, images via <img>. */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.original_filename ?? ''} size="lg">
        {preview ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-2xs text-ink-500">
              <span>
                {preview.document_type_label} · {preview.file_size_label} · v{preview.current_version}
              </span>
              <Button variant="secondary" className="px-2 py-1 text-2xs" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadDocument(preview.id, preview.original_filename)}>
                Download
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border border-ink-200 bg-ink-50">
              {preview.mime_type === 'application/pdf' ? (
                <embed src={`/api/documents/${preview.id}/preview`} type="application/pdf" className="h-[60vh] w-full" />
              ) : (
                <img src={`/api/documents/${preview.id}/preview`} alt={preview.original_filename} className="mx-auto max-h-[60vh] object-contain" />
              )}
            </div>
            {preview.versions && preview.versions.length > 1 ? (
              <div>
                <p className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">Version history</p>
                <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
                  {preview.versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between px-3 py-2 text-2xs">
                      <span className="text-ink-600">
                        v{v.version} · {v.original_filename}
                      </span>
                      <span className="text-ink-400">{formatDateTime(v.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Reject dialog requires a reason. */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject Document"
        description={rejectTarget?.original_filename}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={action.isPending} onClick={doReject}>
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          required
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain why this document is rejected…"
        />
      </Modal>

      <span className="hidden">
        <Archive className="h-4 w-4" />
      </span>
    </div>
  )
}
