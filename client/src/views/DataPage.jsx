import React, { useMemo, useState } from 'react';
import { useOrderController } from '../controllers/orderContext';
import { PageHeading } from './OverviewPage';
import Skeleton from './ui/Skeleton';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import ConfirmDialog from './ui/ConfirmDialog';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Pencil,
  Phone,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
  FileDown,
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const weightLabel = (w) => (w === 1000 ? '1 kg' : `${w} g`);

export default function DataPage() {
  const {
    orders,
    loading,
    removeOrder,
    toggleOrderPayment,
    openOrderModal,
    rowPending,
    downloadPDF,
    downloadingPdf,
  } = useOrderController();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null); // { id, name }

  const counts = useMemo(
    () => ({
      all: orders.length,
      paid: orders.filter((o) => o.status === 'paid').length,
      unpaid: orders.filter((o) => o.status !== 'paid').length,
    }),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'paid' ? order.status === 'paid' : order.status !== 'paid');
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        (order.customerName || '').toLowerCase().includes(q) ||
        (order.phoneNumber || '').includes(q)
      );
    });
  }, [orders, query, filter]);

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    try {
      await removeOrder(confirm.id);
    } catch {
      /* toast already surfaced the failure */
    } finally {
      setConfirm(null);
    }
  };

  if (loading) return <DataSkeleton />;

  const hasFilters = query.trim() !== '' || filter !== 'all';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <PageHeading
        eyebrow="Records"
        title="Orders"
        subtitle={
          hasFilters
            ? `${filtered.length} of ${orders.length} shown`
            : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} on record`
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPDF}
              disabled={downloadingPdf || orders.length === 0}
              className="tap inline-flex shrink-0 items-center gap-2 rounded-full border border-blush-200 bg-cream-50 px-4 py-2.5 text-[13px] font-semibold text-wine-700 hover:bg-blush-50 active:scale-[0.97] disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Spinner size={14} />
              ) : (
                <FileDown className="size-4" strokeWidth={2.25} />
              )}
              <span>{downloadingPdf ? 'Exporting…' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => openOrderModal(null)}
              className="tap hidden shrink-0 items-center gap-2 rounded-full bg-wine-700 px-4 py-2.5 text-[13px] font-semibold text-cream-50 shadow-lift hover:bg-wine-600 active:scale-[0.97] sm:inline-flex"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              New order
            </button>
          </div>
        }
      />

      {/* Search + filters */}
      <div className="anim-fade-up mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-300"
            strokeWidth={2}
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Search name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="tap w-full rounded-xl border border-blush-100 bg-cream-50 py-3 pl-10 pr-10 text-[14px] font-medium text-ink-900 shadow-card outline-none placeholder:text-ink-300 focus:border-wine-600/40 focus:ring-4 focus:ring-wine-700/8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="tap absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-50 hover:text-ink-700"
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <SegmentedFilter value={filter} counts={counts} onChange={setFilter} />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="mt-5">
          {orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No orders yet"
              message="Create your first order and it will show up here instantly."
              action={
                <button
                  type="button"
                  onClick={() => openOrderModal(null)}
                  className="tap inline-flex items-center gap-2 rounded-full bg-wine-700 px-5 py-2.5 text-[13px] font-semibold text-cream-50 shadow-lift hover:bg-wine-600 active:scale-[0.97]"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                  New order
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nothing matched"
              message="Try a different name, phone number, or payment filter."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  className="tap rounded-full border border-blush-200 bg-cream-50 px-5 py-2.5 text-[13px] font-semibold text-wine-700 hover:bg-blush-50"
                >
                  Clear filters
                </button>
              }
            />
          )}
        </div>
      ) : (
        <div className="stagger mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => {
            const id = order._id || order.id;
            return (
              <OrderCard
                key={id}
                order={order}
                pending={rowPending[id]}
                onToggle={() => toggleOrderPayment(id)}
                onEdit={() => openOrderModal(order)}
                onDelete={() => setConfirm({ id, name: order.customerName })}
              />
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this order?"
        message={
          confirm
            ? `The order for ${confirm.name} will be permanently removed.`
            : undefined
        }
        pending={confirm ? rowPending[confirm.id] === 'delete' : false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ───────────────── filter control ───────────────── */

function SegmentedFilter({ value, counts, onChange }) {
  const index = FILTERS.findIndex((f) => f.id === value);

  return (
    <div className="relative flex shrink-0 rounded-xl border border-blush-100 bg-cream-50 p-1 shadow-card">
      {/* sliding indicator */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-lg bg-plum-900 transition-transform duration-300 ease-soft"
        style={{
          width: `calc((100% - 0.5rem) / ${FILTERS.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {FILTERS.map((f) => {
        const active = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors duration-200 sm:flex-none sm:min-w-[86px] ${
              active ? 'text-cream-50' : 'text-ink-500 hover:text-plum-900'
            }`}
          >
            {f.label}
            <span
              className={`rounded px-1 text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                active ? 'bg-cream-50/15 text-blush-200' : 'text-ink-300'
              }`}
            >
              {counts[f.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────── order card ───────────────── */

function OrderCard({ order, pending, onToggle, onEdit, onDelete }) {
  const paid = order.status === 'paid';
  const deleting = pending === 'delete';
  const toggling = pending === 'toggle';

  return (
    <article
      className={`hover-lift relative flex flex-col overflow-hidden rounded-2xl border border-blush-100 bg-cream-50 shadow-card ${
        deleting ? 'pointer-events-none' : ''
      }`}
    >
      {/* delete-in-flight veil */}
      {deleting && (
        <div className="anim-fade-in absolute inset-0 z-20 flex items-center justify-center gap-2 bg-cream-50/80 backdrop-blur-[2px]">
          <Spinner size={16} className="text-wine-700" />
          <span className="text-[13px] font-semibold text-wine-700">Deleting…</span>
        </div>
      )}

      {/* status rail */}
      <span
        className={`absolute inset-y-0 left-0 w-[3px] transition-colors duration-300 ${
          paid ? 'bg-sage-500' : 'bg-blush-300'
        }`}
      />

      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-plum-900">
            {order.customerName}
          </h3>
          {order.phoneNumber ? (
            <a
              href={`tel:${order.phoneNumber}`}
              className="tap mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 hover:text-wine-700"
            >
              <Phone className="size-3" strokeWidth={2.25} />
              {order.phoneNumber}
            </a>
          ) : (
            <p className="mt-1 text-[12px] text-ink-300">No phone number</p>
          )}
        </div>

        <StatusToggle paid={paid} pending={toggling} onClick={onToggle} />
      </header>

      {/* items */}
      <div className="mx-5 mb-4 flex-1 rounded-xl border border-blush-100/70 bg-blush-50/40">
        <div className="label-xs flex items-center justify-between border-b border-blush-100/70 px-3.5 py-2 text-ink-300">
          <span>Item</span>
          <span>Amount</span>
        </div>
        <ul className="no-scrollbar max-h-[132px] divide-y divide-blush-100/70 overflow-y-auto">
          {(order.items || []).map((item, idx) => (
            <li
              key={item._id || `${item.itemName}-${idx}`}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink-800">
                  {item.itemName}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-400 tabular-nums">
                  {weightLabel(item.weight)} × {item.qty}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-plum-900 tabular-nums">
                ₹{Number(item.amount || 0).toLocaleString('en-IN')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-blush-100 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-300">
            <CalendarDays className="size-3" strokeWidth={2.25} />
            {formatDate(order.createdAt)}
          </div>
          <p className="mt-0.5 text-[17px] font-semibold leading-tight text-plum-900 tabular-nums">
            ₹{Number(order.totalPrice || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Edit order" onClick={onEdit} icon={Pencil} />
          <IconButton label="Delete order" onClick={onDelete} icon={Trash2} danger />
        </div>
      </footer>
    </article>
  );
}

function StatusToggle({ paid, pending, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={paid ? 'Mark as unpaid' : 'Mark as paid'}
      aria-label={paid ? 'Mark as unpaid' : 'Mark as paid'}
      className={`tap inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-[11px] font-semibold active:scale-95 disabled:cursor-progress ${
        paid
          ? 'border-sage-100 bg-sage-50 text-sage-600 hover:border-sage-500/40'
          : 'border-blush-200 bg-blush-50 text-wine-700 hover:border-wine-600/40'
      }`}
    >
      {pending ? (
        <Spinner size={12} stroke={1.75} />
      ) : (
        <span
          className={`flex size-3.5 items-center justify-center rounded-full ${
            paid ? 'bg-sage-500 text-cream-50' : 'border border-blush-300'
          }`}
        >
          {paid && <Check className="size-2.5" strokeWidth={3.5} />}
        </span>
      )}
      {paid ? 'Paid' : 'Unpaid'}
    </button>
  );
}

function IconButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`tap flex size-9 items-center justify-center rounded-lg text-ink-400 active:scale-90 ${
        danger ? 'hover:bg-clay-50 hover:text-clay-600' : 'hover:bg-blush-50 hover:text-wine-700'
      }`}
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  );
}

/* ───────────────── loading ───────────────── */

function DataSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-16" rounded="rounded-full" />
        <Skeleton className="h-8 w-32" rounded="rounded-lg" />
        <Skeleton className="h-3 w-28" rounded="rounded-full" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-[46px] flex-1" rounded="rounded-xl" />
        <Skeleton className="h-[46px] sm:w-[278px]" rounded="rounded-xl" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[268px]" rounded="rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
