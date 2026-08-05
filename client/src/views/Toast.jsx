import React from 'react';
import { useOrderController } from '../controllers/orderContext';
import { Check, TriangleAlert, X, Info } from 'lucide-react';

const VARIANTS = {
  success: {
    icon: Check,
    accent: 'bg-sage-500',
    iconWrap: 'bg-sage-100 text-sage-600',
    bar: 'bg-sage-500',
  },
  warning: {
    icon: TriangleAlert,
    accent: 'bg-blush-400',
    iconWrap: 'bg-blush-100 text-blush-500',
    bar: 'bg-blush-400',
  },
  error: {
    icon: X,
    accent: 'bg-clay-500',
    iconWrap: 'bg-clay-100 text-clay-600',
    bar: 'bg-clay-500',
  },
  info: {
    icon: Info,
    accent: 'bg-wine-600',
    iconWrap: 'bg-blush-100 text-wine-700',
    bar: 'bg-wine-600',
  },
};

export default function Toast() {
  const { toasts, dismissToast } = useOrderController();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed left-1/2 top-[4.75rem] z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2.5 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      {toasts.map((toast) => {
        const variant = VARIANTS[toast.type] ?? VARIANTS.info;
        const Icon = variant.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-blush-100 bg-cream-50/95 py-3 pl-3 pr-2.5 shadow-float backdrop-blur-md ${
              toast.exiting ? 'anim-toast-out' : 'anim-toast-in'
            }`}
          >
            {/* Left accent rail */}
            <span className={`absolute inset-y-0 left-0 w-[3px] ${variant.accent}`} />

            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ${variant.iconWrap}`}
            >
              <Icon className="size-3.5" strokeWidth={2.75} />
            </span>

            <p className="flex-1 py-0.5 text-[13px] font-medium leading-snug text-ink-800">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="tap -mr-0.5 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-50 hover:text-ink-700"
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </button>

            {/* Auto-dismiss timer */}
            {!toast.exiting && (
              <span
                className={`toast-timer absolute bottom-0 left-0 h-[2px] w-full opacity-45 ${variant.bar}`}
                style={{ animationDuration: '4000ms' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
