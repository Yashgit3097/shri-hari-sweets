import React, { useState } from 'react';
import { CloudOff, RotateCw } from 'lucide-react';
import Spinner from './Spinner';

/**
 * Shown when the first load fails and there is nothing to fall back to.
 * Owns its own retry-in-flight state so the button can show a spinner.
 */
export default function ErrorState({
  title = 'We could not load your orders',
  message,
  onRetry,
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying || !onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="anim-fade-up mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-6">
        <span className="absolute inset-0 -z-10 scale-150 rounded-full bg-clay-100/70 blur-2xl" />
        <div className="flex size-16 items-center justify-center rounded-2xl border border-clay-100 bg-clay-50 text-clay-500">
          <CloudOff className="size-7" strokeWidth={1.75} />
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold text-plum-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        {message || 'Something went wrong on the way to the server.'}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="tap mt-7 inline-flex items-center gap-2 rounded-full bg-wine-700 px-6 py-3 text-sm font-semibold text-cream-50 shadow-lift hover:bg-wine-600 active:scale-[0.97] disabled:opacity-70"
        >
          {retrying ? (
            <>
              <Spinner size={15} />
              Retrying…
            </>
          ) : (
            <>
              <RotateCw className="size-4" strokeWidth={2.25} />
              Try again
            </>
          )}
        </button>
      )}
    </div>
  );
}
