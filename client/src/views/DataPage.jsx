import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOrderController } from '../controllers/orderContext';
import { PageHeading } from './OverviewPage';
import Skeleton from './ui/Skeleton';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import ConfirmDialog from './ui/ConfirmDialog';
import useBodyLock from '../hooks/useBodyLock';
import QRCode from 'qrcode';
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
  Copy,
  QrCode,
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
    upiId,
    saveUpiId,
  } = useOrderController();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null); // { id, name }
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);

  const handleSaveUpiId = async (newUpiId) => {
    try {
      await saveUpiId(newUpiId);
      setUpiModalOpen(false);
    } catch {
      // Toast already shown
    }
  };

  const handleOpenQrModal = (order) => {
    setSelectedOrderForQr(order);
    setQrModalOpen(true);
  };

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
              onClick={() => setUpiModalOpen(true)}
              className="tap inline-flex shrink-0 items-center gap-2 rounded-full border border-blush-200 bg-cream-50 px-4 py-2.5 text-[13px] font-semibold text-wine-700 hover:bg-blush-50 active:scale-[0.97]"
            >
              <QrCode className="size-4" strokeWidth={2.25} />
              <span>UPI Settings</span>
            </button>
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
                onQrCode={() => handleOpenQrModal(order)}
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

      <UpiSettingsModal
        open={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        onSave={handleSaveUpiId}
        currentUpiId={upiId}
      />

      <QrPaymentModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        order={selectedOrderForQr}
        upiId={upiId}
        onConfigureUpi={() => setUpiModalOpen(true)}
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

function OrderCard({ order, pending, onToggle, onEdit, onDelete, onQrCode }) {
  const paid = order.status === 'paid';
  const deleting = pending === 'delete';
  const toggling = pending === 'toggle';
  const { showToast } = useOrderController();

  const generateMessageText = () => {
    const itemsList = (order.items || [])
      .map((item, idx) => {
        return `${idx + 1}. *${item.itemName}* (${weightLabel(item.weight)} × ${item.qty}) — *₹${Number(item.amount || 0).toLocaleString('en-IN')}*`;
      })
      .join('\n');

    const lines = [
      `✨ SHRI HARI SWEETS ✨`,
      `------------------------------------------`,
      `*Name:* _${order.customerName}_`,
      order.phoneNumber ? `*Phone:* _${order.phoneNumber}_` : null,
      ``,
      itemsList,
      ``,
      `*Total:* *₹${Number(order.totalPrice || 0).toLocaleString('en-IN')}*`,
      `------------------------------------------`,
      `🙏 Thank you for your order!`
    ];

    return lines.filter((l) => l !== null).join('\n');
  };

  const handleCopy = async () => {
    try {
      const text = generateMessageText();
      await navigator.clipboard.writeText(text);
      showToast('Order details copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy order details.', 'error');
    }
  };

  const handleWhatsApp = () => {
    try {
      const text = generateMessageText();
      const cleanPhone = order.phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (err) {
      showToast('Failed to open WhatsApp.', 'error');
    }
  };

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
                  {idx + 1}. {item.itemName}
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
          {order.phoneNumber && (
            <IconButton
              label="Send to WhatsApp"
              onClick={handleWhatsApp}
              icon={WhatsAppIcon}
              variant="whatsapp"
            />
          )}
          <IconButton
            label="Generate Payment QR"
            onClick={onQrCode}
            icon={QrCode}
          />
          <IconButton label="Copy details" onClick={handleCopy} icon={Copy} />
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

function IconButton({ label, icon: Icon, onClick, danger = false, variant = 'default' }) {
  let hoverClasses = 'hover:bg-blush-50 hover:text-wine-700';
  const effectiveVariant = danger ? 'danger' : variant;
  
  if (effectiveVariant === 'danger') {
    hoverClasses = 'hover:bg-clay-50 hover:text-clay-600';
  } else if (effectiveVariant === 'whatsapp') {
    hoverClasses = 'hover:bg-emerald-50 hover:text-emerald-600';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`tap flex size-9 items-center justify-center rounded-lg text-ink-400 active:scale-90 ${hoverClasses}`}
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  );
}

function WhatsAppIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.99L2 22l5.135-1.347a9.957 9.957 0 0 0 4.877 1.279h.005c5.505 0 9.988-4.478 9.99-9.984A9.99 9.99 0 0 0 12.012 2zm4.7 13.061c-.26.734-1.28 1.31-1.77 1.39-.43.08-.99.13-2.88-.61-2.42-.94-3.95-3.36-4.07-3.52-.12-.16-.97-1.29-.97-2.46 0-1.17.61-1.74.83-1.97.22-.23.48-.29.64-.29.16 0 .32.01.46.01.15 0 .36-.06.56.41.2.49.69 1.68.75 1.8.06.12.1.26.02.42-.08.16-.16.26-.26.38-.1.12-.22.27-.31.37-.11.1-.22.22-.09.43.13.22.58.96 1.25 1.56.86.76 1.58 1 1.8 1.1.22.1.35.08.48-.06.13-.15.56-.65.71-.87.15-.22.3-.18.51-.1.21.08 1.34.63 1.57.75.23.12.38.18.44.28.06.1.06.58-.2 1.31z" />
    </svg>
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

/* ───────────────── UPI ID Settings Modal ───────────────── */

function UpiSettingsModal({ open, onClose, onSave, currentUpiId }) {
  const [upiInput, setUpiInput] = useState(currentUpiId);
  const [error, setError] = useState('');
  useBodyLock(open);

  useEffect(() => {
    if (open) {
      setUpiInput(currentUpiId);
      setError('');
    }
  }, [open, currentUpiId]);

  if (!open) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const clean = upiInput.trim();
    if (!clean) {
      setError('UPI ID cannot be empty');
      return;
    }
    if (!clean.includes('@')) {
      setError('Invalid UPI ID format (must contain @)');
      return;
    }
    onSave(clean);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-5 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-plum-950/55 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="anim-dialog relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-blush-100 bg-cream-50 shadow-float">
        <header className="flex items-center justify-between border-b border-blush-100 px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-plum-900">UPI Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="tap flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-blush-50 hover:text-wine-700"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSave} className="p-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="upi-id-input" className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
                Merchant UPI ID
              </label>
              <input
                id="upi-id-input"
                type="text"
                value={upiInput}
                onChange={(e) => setUpiInput(e.target.value)}
                placeholder="e.g. merchant@upi"
                className="tap w-full rounded-xl border border-blush-100 bg-cream-50 px-4 py-3 text-[14px] font-medium text-ink-900 outline-none focus:border-wine-600/40 focus:ring-4 focus:ring-wine-700/8"
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-xs text-clay-500 font-semibold">{error}</p>
              )}
            </div>
            <p className="text-xs text-ink-400 leading-relaxed">
              This UPI ID will be used to generate scan-to-pay QR codes for your customers.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="tap rounded-xl border border-blush-200 bg-cream-50 px-4 py-2.5 text-sm font-semibold text-wine-700 hover:bg-blush-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tap rounded-xl bg-wine-700 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-wine-600 shadow-lift"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────── Payment QR Code Modal ───────────────── */

function QrPaymentModal({ open, onClose, order, upiId, onConfigureUpi }) {
  const canvasRef = useRef(null);
  const [imgUrl, setImgUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const { showToast } = useOrderController();

  useBodyLock(open);

  useEffect(() => {
    if (!open || !order || !upiId) return;

    const drawCard = async () => {
      try {
        const upiUrl = `upi://pay?pa=${upiId}&pn=Shri%20Hari%20Sweets&am=${order.totalPrice}&cu=INR&tn=Order`;
        
        const qrDataUrl = await QRCode.toDataURL(upiUrl, {
          margin: 1,
          width: 520,
          color: {
            dark: '#2c1620',
            light: '#ffffff'
          }
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const scale = 2;
        const width = 300 * scale;
        const height = 440 * scale;
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // Fill background
        ctx.fillStyle = '#fbf9fa';
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#6b2b3a';
        ctx.lineWidth = 4 * scale;
        ctx.strokeRect(2 * scale, 2 * scale, width - 4 * scale, height - 4 * scale);

        // Header Title
        ctx.fillStyle = '#6b2b3a';
        ctx.font = `bold ${18 * scale}px "Fraunces", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('SHRI HARI SWEETS', width / 2, 28 * scale);

        // Divider
        ctx.strokeStyle = '#ecdee4';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(30 * scale, 56 * scale);
        ctx.lineTo(270 * scale, 56 * scale);
        ctx.stroke();

        // Subtitle
        ctx.fillStyle = '#98737f';
        ctx.font = `600 ${9 * scale}px "Inter", sans-serif`;
        ctx.fillText('SCAN & PAY VIA ANY UPI APP', width / 2, 68 * scale);

        // Draw QR Image
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((resolve) => {
          qrImg.onload = resolve;
        });

        const qrSize = 180 * scale;
        const qrX = (width - qrSize) / 2;
        const qrY = 92 * scale;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);



        // Divider
        ctx.strokeStyle = '#ecdee4';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(30 * scale, 292 * scale);
        ctx.lineTo(270 * scale, 292 * scale);
        ctx.stroke();

        // Customer Details
        ctx.textBaseline = 'top';
        
        // Customer Name
        ctx.fillStyle = '#2a2a2e';
        ctx.font = `600 ${12 * scale}px "Inter", sans-serif`;
        ctx.fillText(order.customerName, width / 2, 308 * scale);

        // Phone Number (if present)
        let currentY = 328 * scale;
        if (order.phoneNumber) {
          ctx.fillStyle = '#6f6b74';
          ctx.font = `500 ${10 * scale}px "Inter", sans-serif`;
          ctx.fillText(order.phoneNumber, width / 2, currentY);
          currentY += 18 * scale;
        }

        // Amount to Pay
        ctx.fillStyle = '#6b2b3a';
        ctx.font = `bold ${18 * scale}px "Inter", sans-serif`;
        ctx.fillText(`₹${Number(order.totalPrice || 0).toLocaleString('en-IN')}`, width / 2, currentY);

        // Footer Thank You
        ctx.fillStyle = '#98737f';
        ctx.font = `italic ${9 * scale}px "Fraunces", Georgia, serif`;
        ctx.fillText('Thank you for your order!', width / 2, 400 * scale);

        const dataUrl = canvas.toDataURL('image/png');
        setImgUrl(dataUrl);
      } catch (err) {
        console.error('Failed to draw canvas card:', err);
      }
    };

    drawCard();
  }, [open, order, upiId]);

  if (!open || !order) return null;

  if (!upiId) {
    return createPortal(
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center p-5">
        <div className="absolute inset-0 bg-plum-950/55 backdrop-blur-[3px]" onClick={onClose} />
        <div className="anim-dialog relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-blush-100 bg-cream-50 shadow-float p-6 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-blush-50 text-wine-700">
            <QrCode className="size-5" />
          </div>
          <h3 className="font-display text-lg font-semibold text-plum-900">UPI ID Required</h3>
          <p className="mt-2 text-sm text-ink-500 leading-relaxed">
            Please configure your merchant UPI ID first so we can generate payment QR codes.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onConfigureUpi();
              }}
              className="tap w-full rounded-xl bg-wine-700 py-3 text-sm font-semibold text-cream-50 hover:bg-wine-600 shadow-lift"
            >
              Configure UPI ID
            </button>
            <button
              type="button"
              onClick={onClose}
              className="tap w-full rounded-xl border border-blush-200 py-3 text-sm font-semibold text-wine-700 hover:bg-blush-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `shri_hari_sweets_pay_${order.customerName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Payment card downloaded!', 'success');
  };

  const getShareText = () => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=Shri%20Hari%20Sweets&am=${order.totalPrice}&cu=INR&tn=Order`;
    return `✨ *SHRI HARI SWEETS* ✨\n------------------------------------------\n🙏 *Thanks for your order!*\n\n*Name:* _${order.customerName}_\n${order.phoneNumber ? `*Mobile:* _${order.phoneNumber}_\n` : ''}*Amount to Pay:* *₹${Number(order.totalPrice).toLocaleString('en-IN')}*\n\n🔗 *Pay directly via UPI:*\n${upiUrl}\n------------------------------------------\nScan the QR code or click the link above to pay. Please reply with a screenshot once paid!`;
  };

  const handleWhatsAppShare = () => {
    try {
      const text = getShareText();
      const cleanPhone = order.phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      showToast('Opening WhatsApp...', 'success');
    } catch (err) {
      showToast('Failed to open WhatsApp.', 'error');
    }
  };

  const handleWebShare = async () => {
    if (!imgUrl) return;
    setSharing(true);
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], `shri_hari_sweets_pay.png`, { type: 'image/png' });

      const shareData = {
        files: [file],
        title: 'Shri Hari Sweets Payment QR',
        text: `Thanks for your order! Amount to pay: ₹${Number(order.totalPrice).toLocaleString('en-IN')}`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Shared successfully!', 'success');
      } else {
        handleDownload();
        handleWhatsAppShare();
      }
    } catch (err) {
      handleDownload();
      handleWhatsAppShare();
    } finally {
      setSharing(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-plum-950/55 backdrop-blur-[3px]" onClick={onClose} />

      <div className="anim-dialog relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-blush-100 bg-cream-50 shadow-float animate-fade-in">
        <header className="flex items-center justify-between border-b border-blush-100 px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-plum-900">Payment QR</h3>
          <button
            type="button"
            onClick={onClose}
            className="tap flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-blush-50 hover:text-wine-700"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-5 flex flex-col items-center">
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {imgUrl ? (
            <img
              src={imgUrl}
              alt="Payment Card QR"
              className="w-[240px] h-[352px] rounded-xl border border-blush-100 shadow-card object-contain bg-white"
            />
          ) : (
            <div className="w-[240px] h-[352px] rounded-xl border border-blush-100 flex items-center justify-center bg-cream-100">
              <Spinner size={24} className="text-wine-700" />
            </div>
          )}

          <div className="mt-5 w-full flex flex-col gap-2">
            <button
              type="button"
              onClick={handleWebShare}
              disabled={sharing || !imgUrl}
              className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-cream-50 hover:bg-emerald-500 shadow-lift disabled:opacity-50"
            >
              {sharing ? <Spinner size={14} /> : <WhatsAppIcon className="size-4 text-white" />}
              <span>Share Card on WhatsApp</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!imgUrl}
                className="tap flex items-center justify-center gap-1.5 rounded-xl border border-blush-200 bg-cream-50 py-2.5 text-xs font-semibold text-wine-700 hover:bg-blush-50 disabled:opacity-50"
              >
                <FileDown className="size-3.5" />
                <span>Save Image</span>
              </button>
              
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="tap flex items-center justify-center gap-1.5 rounded-xl border border-blush-200 bg-cream-50 py-2.5 text-xs font-semibold text-wine-700 hover:bg-blush-50"
              >
                <Copy className="size-3.5" />
                <span>Send Text Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
