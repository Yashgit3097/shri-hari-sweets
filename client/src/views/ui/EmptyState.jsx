import React from 'react';

/** Quiet placeholder for "nothing here yet" and "nothing matched". */
export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="anim-fade-up flex flex-col items-center rounded-2xl border border-dashed border-blush-200 bg-cream-50/60 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blush-50 text-blush-400">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      )}
      <p className="font-display text-base font-semibold text-plum-900">{title}</p>
      {message && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-400">{message}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
