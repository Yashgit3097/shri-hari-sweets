import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import Spinner from './Spinner';
import useBodyLock from '../../hooks/useBodyLock';

/**
 * Replaces window.confirm for destructive actions.
 * `pending` keeps the dialog open with a spinner while the request runs.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  pending = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  useBodyLock(open);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !pending) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  /* Portalled to <body> so an animated ancestor can never become its
     containing block and knock the overlay out of the viewport. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-5"
    >
      <div
        className="anim-fade-in absolute inset-0 bg-plum-950/55 backdrop-blur-[3px]"
        onClick={() => !pending && onCancel?.()}
      />

      <div className="anim-dialog relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-blush-100 bg-cream-50 shadow-float">
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-clay-50 text-clay-500">
            <AlertTriangle className="size-5" strokeWidth={2} />
          </div>
          <h3
            id="confirm-title"
            className="font-display text-lg font-semibold text-plum-900"
          >
            {title}
          </h3>
          {message && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-blush-100 bg-blush-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="tap bg-cream-50 py-3.5 text-sm font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="tap inline-flex items-center justify-center gap-2 bg-cream-50 py-3.5 text-sm font-semibold text-clay-600 hover:bg-clay-50 disabled:opacity-60"
          >
            {pending && <Spinner size={14} />}
            {pending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
