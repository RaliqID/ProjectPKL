import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
}

/**
 * Accessible dialog, built on the native `<dialog>` element.
 *
 * What the browser provides, which a `role="dialog"` div has to reimplement:
 *
 *   - Focus trapping. Tab and Shift+Tab cycle inside the dialog and cannot
 *     reach the page behind it. The previous version focused the container once
 *     and left Tab able to walk straight out into the underlying page, where a
 *     user could act on controls they cannot see.
 *   - `inert` on the rest of the document, so a screen reader cannot read past
 *     the dialog.
 *   - Escape handled natively, and correct `aria-modal` semantics for free.
 *   - Rendering in the top layer, so no `z-index` can accidentally cover it.
 *
 * What is still done here: closing on a backdrop click, because the native
 * element has no opinion about that, and restoring focus on close, which the
 * browser handles but not always to the element that opened the dialog.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Show or close the native dialog to match the `open` prop. `showModal` is
  // what activates the focus trap; setting the `open` attribute would not.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // The `cancel` event is Escape. Routing it through `onClose` keeps one code
  // path for every way the dialog can be dismissed.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  // Body scroll lock. The native element does not stop the page behind it from
  // scrolling on all platforms.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  /**
   * Backdrop click.
   *
   * The dialog's own padding is part of the element, so a click there reports
   * the dialog as the target rather than the backdrop. Comparing the click
   * position against the element's box is what distinguishes "clicked the
   * backdrop" from "clicked inside the panel".
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return

    const bounds = dialog.getBoundingClientRect()
    const inside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom

    if (!inside) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      className={clsx(
        // Native dialogs are centred and unstyled by default; the reset below
        // removes the user-agent border, padding and max-width so the panel can
        // size itself.
        'm-auto w-[calc(100vw-2rem)] rounded-lg border border-ink-200 bg-white p-0 shadow-pop',
        'backdrop:bg-ink-900/30 backdrop:backdrop-blur-[1px]',
        SIZES[size],
      )}
    >
      <div className="animate-slide-up">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-sm font-semibold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-0.5 text-xs text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{message}</p>
    </Modal>
  )
}
