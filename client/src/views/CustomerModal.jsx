import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOrderController } from '../controllers/orderContext';
import { SWEET_NAMES, WEIGHT_OPTIONS, getPredefinedPrice } from '../config/sweets';
import useBodyLock from '../hooks/useBodyLock';
import Spinner from './ui/Spinner';
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';

let rowSeq = 0;
const newRow = (itemName = SWEET_NAMES[0], weight = 250, qty = 1) => {
  const price = getPredefinedPrice(itemName, weight);
  return { key: `row-${++rowSeq}`, itemName, weight, qty, price, amount: price * qty };
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Thin wrapper: the form only exists while the sheet is open, and remounts
 * per order. That keeps every field initialised from props instead of being
 * reset by an effect.
 */
export default function CustomerModal() {
  const { modal } = useOrderController();
  if (!modal.open) return null;

  const order = modal.order;
  return <OrderForm key={order?._id || order?.id || 'new'} order={order} />;
}

function OrderForm({ order }) {
  const { closeOrderModal, orders, addOrder, editOrder, submitting } =
    useOrderController();

  const isEdit = Boolean(order);

  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [phoneNumber, setPhoneNumber] = useState(order?.phoneNumber || '');
  const [items, setItems] = useState(() =>
    order?.items?.length
      ? order.items.map((item) => ({
          key: `row-${++rowSeq}`,
          itemName: item.itemName,
          weight: item.weight,
          qty: item.qty,
          price: item.price,
          amount: item.amount,
        }))
      : [newRow()]
  );
  const [status, setStatus] = useState(order?.status || 'unpaid');
  const [errors, setErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const nameFieldRef = useRef(null);
  const nameInputRef = useRef(null);

  useBodyLock(true);

  /* Focus the first field once the sheet has finished sliding in. */
  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 240);
    return () => clearTimeout(t);
  }, []);

  /* Escape to close, click-outside to dismiss the autocomplete. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showSuggestions) setShowSuggestions(false);
      else if (!submitting) closeOrderModal();
    };
    const onPointerDown = (e) => {
      if (nameFieldRef.current && !nameFieldRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [showSuggestions, submitting, closeOrderModal]);

  /* Unique past customers, for the name autocomplete. */
  const directory = useMemo(() => {
    const seen = new Map();
    orders.forEach((o) => {
      const key = (o.customerName || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.set(key, { name: o.customerName, phone: o.phoneNumber });
      }
    });
    return [...seen.values()];
  }, [orders]);

  const suggestions = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q) return [];
    return directory
      .filter((c) => c.name.toLowerCase().includes(q) && c.name.toLowerCase() !== q)
      .slice(0, 5);
  }, [directory, customerName]);

  const grandTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  /* ───────────── handlers ───────────── */

  const patchRow = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item };

        if (field === 'itemName') {
          next.itemName = value;
          next.price = getPredefinedPrice(value, next.weight);
        } else if (field === 'weight') {
          next.weight = parseInt(value, 10);
          next.price = getPredefinedPrice(next.itemName, next.weight);
        } else if (field === 'qty') {
          next.qty = Math.min(999, Math.max(1, parseInt(value, 10) || 1));
        }

        next.amount = next.price * next.qty;
        return next;
      })
    );
  };

  const validate = () => {
    const next = {};
    if (!customerName.trim()) next.customerName = 'Customer name is required.';
    const digits = phoneNumber.replace(/\D/g, '');
    if (phoneNumber.trim() && (digits.length < 10 || digits.length > 13)) {
      next.phoneNumber = 'Enter a valid phone number.';
    }
    if (!items.length) next.items = 'Add at least one sweet.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const payload = {
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      items: items.map(({ itemName, weight, qty, price, amount }) => ({
        itemName,
        weight,
        qty,
        price,
        amount,
      })),
      totalPrice: grandTotal,
      status,
    };

    try {
      if (isEdit) await editOrder(order._id || order.id, payload);
      else await addOrder(payload);
      closeOrderModal();
    } catch {
      /* toast already surfaced the failure — keep the sheet open */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
      className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        className="anim-fade-in absolute inset-0 bg-plum-950/55 backdrop-blur-[3px]"
        onClick={() => !submitting && closeOrderModal()}
      />

      <div className="anim-enter-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-blush-100 bg-cream-100 shadow-float sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl">
        {/* grab handle, mobile only */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-blush-200" />
        </div>

        {/* header */}
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div>
            <span className="label-xs text-blush-500">
              {isEdit ? 'Editing' : 'New record'}
            </span>
            <h2
              id="order-modal-title"
              className="font-display mt-1 text-xl font-semibold tracking-tight text-plum-900"
            >
              {isEdit ? 'Edit order' : 'New order'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !submitting && closeOrderModal()}
            aria-label="Close"
            className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-blush-50 hover:text-ink-900 active:scale-90"
          >
            <X className="size-[18px]" strokeWidth={2} />
          </button>
        </header>

        {/* body */}
        <form
          id="order-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 space-y-5 overflow-y-auto px-5 pb-5 sm:px-6"
        >
          {/* customer */}
          <Fieldset title="Customer">
            <div className="relative" ref={nameFieldRef}>
              <Field label="Name" error={errors.customerName} required>
                <input
                  ref={nameInputRef}
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Rajesh Shah"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowSuggestions(true);
                    if (errors.customerName) {
                      setErrors((p) => ({ ...p, customerName: undefined }));
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className={inputClass(errors.customerName)}
                />
              </Field>

              {showSuggestions && suggestions.length > 0 && (
                <ul className="anim-pop absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-blush-100 bg-cream-50 shadow-float">
                  {suggestions.map((c) => (
                    <li key={c.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName(c.name);
                          setPhoneNumber(c.phone || '');
                          setShowSuggestions(false);
                        }}
                        className="tap flex w-full items-center justify-between gap-3 border-b border-blush-100 px-4 py-3 text-left last:border-b-0 hover:bg-blush-50"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blush-100 text-wine-700">
                            <User className="size-3" strokeWidth={2.25} />
                          </span>
                          <span className="truncate text-[13px] font-medium text-ink-900">
                            {c.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-300">
                          {c.phone || 'No phone'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="Phone" error={errors.phoneNumber} hint="Optional">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="e.g. 98765 43210"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errors.phoneNumber) {
                    setErrors((p) => ({ ...p, phoneNumber: undefined }));
                  }
                }}
                className={inputClass(errors.phoneNumber)}
              />
            </Field>
          </Fieldset>

          {/* items */}
          <Fieldset
            title="Sweets"
            action={
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, newRow()])}
                className="tap inline-flex items-center gap-1.5 rounded-full border border-blush-200 bg-cream-50 px-3 py-1.5 text-[12px] font-semibold text-wine-700 hover:bg-blush-50 active:scale-95"
              >
                <Plus className="size-3.5" strokeWidth={2.5} />
                Add sweet
              </button>
            }
          >
            <div className="space-y-3">
              {items.map((item, idx) => (
                <ItemRow
                  key={item.key}
                  item={item}
                  index={idx}
                  canRemove={items.length > 1}
                  onChange={patchRow}
                  onRemove={() =>
                    setItems((prev) => prev.filter((_, i) => i !== idx))
                  }
                />
              ))}
            </div>
          </Fieldset>

          {/* payment */}
          <Fieldset title="Payment">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'unpaid', label: 'Unpaid' },
                { id: 'paid', label: 'Paid' },
              ].map((opt) => {
                const active = status === opt.id;
                const isPaid = opt.id === 'paid';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    aria-pressed={active}
                    className={`tap flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold active:scale-[0.98] ${
                      active
                        ? isPaid
                          ? 'border-sage-500 bg-sage-50 text-sage-600'
                          : 'border-wine-700 bg-blush-50 text-wine-700'
                        : 'border-blush-100 bg-cream-50 text-ink-400 hover:border-blush-200'
                    }`}
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded-full border transition-colors duration-200 ${
                        active
                          ? isPaid
                            ? 'border-sage-500 bg-sage-500 text-cream-50'
                            : 'border-wine-700 bg-wine-700 text-cream-50'
                          : 'border-blush-200'
                      }`}
                    >
                      {active && <Check className="size-2.5" strokeWidth={4} />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Fieldset>
        </form>

        {/* footer */}
        <footer className="safe-b flex items-center justify-between gap-4 border-t border-blush-100 bg-cream-50 px-5 py-4 sm:px-6">
          <div>
            <span className="label-xs text-ink-300">Grand total</span>
            <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-plum-900 tabular-nums">
              {inr(grandTotal)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeOrderModal}
              disabled={submitting}
              className="tap rounded-full px-4 py-3 text-[13px] font-semibold text-ink-500 hover:bg-blush-50 hover:text-ink-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="order-form"
              disabled={submitting}
              className="tap inline-flex min-w-[130px] items-center justify-center gap-2 rounded-full bg-wine-700 px-5 py-3 text-[13px] font-semibold text-cream-50 shadow-lift hover:bg-wine-600 active:scale-[0.97] disabled:opacity-70"
            >
              {submitting && <Spinner size={14} />}
              {submitting
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : 'Create order'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────── form pieces ───────────────── */

const inputClass = (hasError) =>
  `tap w-full rounded-xl border bg-cream-50 px-3.5 py-3 text-[14px] font-medium text-ink-900 outline-none placeholder:text-ink-300 focus:ring-4 ${
    hasError
      ? 'border-clay-500/60 focus:border-clay-500 focus:ring-clay-500/10'
      : 'border-blush-100 focus:border-wine-600/40 focus:ring-wine-700/8'
  }`;

function Fieldset({ title, action, children }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="label-xs text-blush-500">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[12px] font-semibold text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-wine-500">*</span>}
        </span>
        {hint && !error && (
          <span className="text-[11px] font-medium text-ink-300">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="anim-fade-in mt-1.5 block text-[11px] font-medium text-clay-600">
          {error}
        </span>
      )}
    </label>
  );
}

function ItemRow({ item, index, canRemove, onChange, onRemove }) {
  return (
    <div className="anim-fade-up rounded-xl border border-blush-100 bg-cream-50 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="grid flex-1 grid-cols-2 gap-2.5">
          <SelectField
            label="Sweet"
            value={item.itemName}
            onChange={(v) => onChange(index, 'itemName', v)}
            options={SWEET_NAMES.map((n) => ({ value: n, label: n }))}
          />
          <SelectField
            label="Pack"
            value={item.weight}
            onChange={(v) => onChange(index, 'weight', v)}
            options={WEIGHT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove sweet"
            className="tap mt-[22px] flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-clay-50 hover:text-clay-600 active:scale-90"
          >
            <Trash2 className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-blush-100 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="label-xs text-ink-300">Qty</span>
          <div className="flex items-center rounded-lg border border-blush-100 bg-cream-100 p-0.5">
            <StepButton
              icon={Minus}
              label="Decrease quantity"
              disabled={item.qty <= 1}
              onClick={() => onChange(index, 'qty', item.qty - 1)}
            />
            <span className="min-w-8 text-center text-[13px] font-semibold text-plum-900 tabular-nums">
              {item.qty}
            </span>
            <StepButton
              icon={Plus}
              label="Increase quantity"
              onClick={() => onChange(index, 'qty', item.qty + 1)}
            />
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium text-ink-300 tabular-nums">
            {inr(item.price)} each
          </p>
          <p className="text-[15px] font-semibold leading-tight text-plum-900 tabular-nums">
            {inr(item.amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="label-xs mb-1.5 block text-ink-300">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tap w-full appearance-none rounded-lg border border-blush-100 bg-cream-100 py-2.5 pl-3 pr-8 text-[13px] font-semibold text-ink-900 outline-none focus:border-wine-600/40 focus:ring-4 focus:ring-wine-700/8"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
          strokeWidth={2.25}
        />
      </span>
    </label>
  );
}

function StepButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="tap flex size-7 items-center justify-center rounded-md text-ink-500 hover:bg-cream-50 hover:text-wine-700 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
    </button>
  );
}
