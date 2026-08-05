import React, { useEffect, useState } from 'react';
import { useOrderController } from '../controllers/orderContext';
import { RefreshCw } from 'lucide-react';

const CONNECTION_COPY = {
  live: { label: 'Live', dot: 'bg-sage-500', text: 'text-sage-600', halo: true },
  connecting: { label: 'Connecting', dot: 'bg-blush-400', text: 'text-blush-500', halo: false },
  offline: { label: 'Offline', dot: 'bg-clay-500', text: 'text-clay-600', halo: false },
};

export default function TopBar() {
  const { connection, refreshing, refresh, status } = useOrderController();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const state = CONNECTION_COPY[connection] ?? CONNECTION_COPY.connecting;

  return (
    <header
      className={`frosted sticky top-0 z-40 border-b transition-[border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-blush-200/70 shadow-[0_1px_16px_-8px_rgba(59,29,42,0.35)]'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <Monogram />
          <div className="min-w-0">
            <h1 className="font-display text-[17px] font-semibold leading-none tracking-tight text-plum-900 sm:text-xl">
              Shri Hari Sweets
            </h1>
            <p className="label-xs mt-1 truncate text-blush-500">Order Manager</p>
          </div>
        </div>

        {/* Connection + manual refresh */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-blush-200/80 bg-cream-50/80 py-1.5 pl-2.5 pr-3">
            <span className="relative flex size-2">
              {state.halo && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sage-500 opacity-60" />
              )}
              <span className={`relative inline-flex size-2 rounded-full ${state.dot}`} />
            </span>
            <span className={`label-xs ${state.text}`}>{state.label}</span>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || status === 'loading'}
            aria-label="Refresh data"
            title="Refresh data"
            className="tap flex size-9 items-center justify-center rounded-full border border-blush-200/80 bg-cream-50/80 text-ink-500 hover:border-wine-600/30 hover:text-wine-700 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Background-refresh hairline */}
      <div
        className={`progress-indeterminate h-0.5 bg-blush-100 transition-opacity duration-300 ${
          refreshing ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
    </header>
  );
}

/** Wordmark badge — initials set in the display serif. */
function Monogram() {
  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-plum-800 to-wine-700 shadow-lift">
      <span className="font-display text-[15px] font-semibold leading-none text-cream-100">
        SH
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-blush-300/25" />
    </div>
  );
}
