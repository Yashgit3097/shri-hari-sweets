import React from 'react';
import { useOrderController } from '../controllers/orderContext';
import { LayoutGrid, ReceiptText, Plus } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'data', label: 'Orders', icon: ReceiptText },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, openOrderModal, orders, status } =
    useOrderController();

  return (
    <nav
      aria-label="Primary"
      className="safe-b pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-3 sm:pb-5"
    >
      <div className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-blush-200/60 bg-plum-900/92 p-1.5 shadow-float backdrop-blur-xl">
        <NavTab
          {...TABS[0]}
          active={activeTab === TABS[0].id}
          onClick={() => setActiveTab(TABS[0].id)}
        />

        <NewOrderButton onClick={() => openOrderModal(null)} />

        <NavTab
          {...TABS[1]}
          active={activeTab === TABS[1].id}
          badge={status === 'ready' ? orders.length : null}
          onClick={() => setActiveTab(TABS[1].id)}
        />
      </div>
    </nav>
  );
}

/**
 * Icon button whose label slides open when the tab becomes active.
 * The width animation uses the grid-fr trick so it stays on the compositor.
 */
function NavTab({ label, icon: Icon, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`tap group relative flex h-12 items-center rounded-full px-4 outline-offset-4 ${active
        ? 'bg-cream-100 text-plum-900 shadow-[inset_0_-1px_0_rgba(59,29,42,0.08)]'
        : 'text-blush-300 hover:bg-plum-800/70 hover:text-cream-100'
        }`}
    >
      <span className="relative flex items-center">
        <Icon
          className={`size-[19px] transition-transform duration-300 ${active ? 'scale-105' : 'group-active:scale-90'
            }`}
          strokeWidth={active ? 2.2 : 1.9}
        />
        {!active && badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1 flex min-w-[15px] justify-center rounded-full bg-wine-500 px-1 text-[9px] font-bold leading-[15px] text-cream-50">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>

      <span
        className={`grid transition-[grid-template-columns] duration-300 ease-soft ${active ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
          }`}
      >
        <span className="overflow-hidden">
          <span
            className={`block whitespace-nowrap pl-2 text-[13px] font-semibold tracking-tight transition-opacity duration-200 ${active ? 'opacity-100 delay-75' : 'opacity-0'
              }`}
          >
            {label}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Raised centre action — the one thing this app is for. */
function NewOrderButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="New order"
      title="New order"
      className="tap group relative mx-0.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-wine-500 to-wine-700 text-cream-50 shadow-fab active:scale-[0.93]"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-blush-300/30" />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-blush-300/0 transition-colors duration-300 group-hover:bg-blush-300/12" />
      <Plus
        className="size-5 transition-transform duration-300 ease-spring group-hover:rotate-90"
        strokeWidth={2.5}
      />
    </button>
  );
}
