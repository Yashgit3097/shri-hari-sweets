import React, { useMemo } from 'react';
import { useOrderController } from '../controllers/orderContext';
import { SWEET_NAMES } from '../config/sweets';
import useCountUp from '../hooks/useCountUp';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import {
  Boxes,
  Clock3,
  IndianRupee,
  Scale,
  ShoppingBag,
  Users,
  FileDown,
} from 'lucide-react';
import Spinner from './ui/Spinner';

/* ───────────────── formatting ───────────────── */

const inr = (n) =>
  `₹${Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatWeight = (grams) => {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(kg % 1 === 0 ? 0 : 2)} kg`;
  }
  return `${grams} g`;
};

const weightLabel = (w) => (w === 1000 ? '1 kg' : `${w} g`);

/* ───────────────── page ───────────────── */

export default function OverviewPage() {
  const { orders, loading, downloadPDF, downloadingPdf } = useOrderController();

  const stats = useMemo(() => {
    let collected = 0;
    let pending = 0;
    let paidCount = 0;
    let totalBoxes = 0;

    const weightMap = Object.fromEntries(SWEET_NAMES.map((n) => [n, 0]));
    const boxesMap = {};
    const customers = new Set();

    orders.forEach((order) => {
      if (order.status === 'paid') {
        collected += order.totalPrice || 0;
        paidCount += 1;
      } else {
        pending += order.totalPrice || 0;
      }

      if (order.customerName) {
        customers.add(order.customerName.trim().toLowerCase());
      }

      (order.items || []).forEach(({ itemName, weight, qty }) => {
        const quantity = qty || 0;
        weightMap[itemName] = (weightMap[itemName] || 0) + (weight || 0) * quantity;
        totalBoxes += quantity;

        const key = `${itemName}__${weight}`;
        if (!boxesMap[key]) {
          boxesMap[key] = { itemName, weight, count: 0 };
        }
        boxesMap[key].count += quantity;
      });
    });

    const weights = Object.entries(weightMap)
      .map(([name, grams]) => ({ name, grams }))
      .sort((a, b) => b.grams - a.grams);

    const boxes = Object.values(boxesMap).sort(
      (a, b) => b.count - a.count || a.itemName.localeCompare(b.itemName)
    );

    return {
      collected,
      pending,
      total: collected + pending,
      paidCount,
      unpaidCount: orders.length - paidCount,
      totalBoxes,
      customerCount: customers.size,
      weights,
      maxWeight: Math.max(1, ...weights.map((w) => w.grams)),
      boxes,
      maxBoxes: Math.max(1, ...boxes.map((b) => b.count)),
    };
  }, [orders]);

  if (loading) return <OverviewSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <PageHeading
        eyebrow="Dashboard"
        title="Overview"
        subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'} on record`}
        action={
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
        }
      />

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            message="Once you record your first order, sales and box totals will appear here."
          />
        </div>
      ) : (
        <div className="stagger mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Revenue hero */}
          <div className="lg:col-span-7 xl:col-span-8">
            <RevenueCard stats={stats} />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-5 xl:col-span-4">
            <StatTile
              icon={ShoppingBag}
              label="Orders"
              value={stats.paidCount + stats.unpaidCount}
              caption={`${stats.paidCount} settled`}
            />
            <StatTile
              icon={Users}
              label="Customers"
              value={stats.customerCount}
              caption="unique names"
            />
            <StatTile
              icon={Boxes}
              label="Boxes"
              value={stats.totalBoxes}
              caption="to prepare"
            />
            <StatTile
              icon={Clock3}
              label="Unsettled"
              value={stats.unpaidCount}
              caption="awaiting payment"
              tone={stats.unpaidCount > 0 ? 'alert' : 'default'}
            />
          </div>

          {/* Weight breakdown */}
          <div className="lg:col-span-5 xl:col-span-5">
            <WeightCard stats={stats} />
          </div>

          {/* Box distribution */}
          <div className="lg:col-span-7 xl:col-span-7">
            <BoxCard stats={stats} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── pieces ───────────────── */

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="anim-fade-up flex items-end justify-between gap-4">
      <div className="min-w-0">
        <span className="label-xs text-blush-500">{eyebrow}</span>
        <h2 className="font-display mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-plum-900 sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-[13px] text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function RevenueCard({ stats }) {
  const animatedTotal = useCountUp(stats.total);
  const collectedPct = stats.total ? (stats.collected / stats.total) * 100 : 0;

  return (
    <article className="relative h-full overflow-hidden rounded-2xl bg-linear-to-br from-plum-800 via-plum-900 to-plum-950 p-6 shadow-lift sm:p-7">
      {/* soft light source, top-right */}
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-blush-300/12" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="label-xs text-blush-300/80">Total order value</span>
            <p className="font-display mt-2.5 text-[38px] font-semibold leading-none tracking-tight text-cream-50 tabular-nums sm:text-[44px]">
              {inr(animatedTotal)}
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream-50/10 text-blush-200 ring-1 ring-inset ring-blush-300/20">
            <IndianRupee className="size-[18px]" strokeWidth={2} />
          </span>
        </div>

        {/* Split bar */}
        <div className="mt-7">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-cream-50/12">
            <div
              className="bar-fill h-full rounded-full bg-sage-500"
              style={{ width: `${collectedPct}%` }}
            />
            <div className="h-full flex-1 rounded-full bg-blush-300/70" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SplitLegend
              dot="bg-sage-500"
              label="Collected"
              value={inr(stats.collected)}
              share={`${Math.round(collectedPct)}%`}
            />
            <SplitLegend
              dot="bg-blush-300"
              label="Pending"
              value={inr(stats.pending)}
              share={`${Math.round(100 - collectedPct)}%`}
              align="right"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function SplitLegend({ dot, label, value, share, align = 'left' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div
        className={`flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        <span className={`size-1.5 rounded-full ${dot}`} />
        <span className="label-xs text-blush-300/70">{label}</span>
      </div>
      <p className="mt-1.5 text-[17px] font-semibold leading-none text-cream-50 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-blush-300/60">{share} of total</p>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, caption, tone = 'default' }) {
  const animated = useCountUp(value);
  const alert = tone === 'alert';

  return (
    <article className="hover-lift rounded-2xl border border-blush-100 bg-cream-50 p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${
            alert ? 'bg-clay-50 text-clay-500' : 'bg-blush-50 text-wine-700'
          }`}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        {alert && value > 0 && (
          <span className="size-1.5 rounded-full bg-clay-500 anim-halo" />
        )}
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-none tracking-tight text-plum-900 tabular-nums">
        {Math.round(animated)}
      </p>
      <p className="label-xs mt-2 text-ink-400">{label}</p>
      {caption && <p className="mt-1 text-[11px] text-ink-300">{caption}</p>}
    </article>
  );
}

function SectionCard({ icon: Icon, title, meta, children }) {
  return (
    <section className="hover-lift h-full rounded-2xl border border-blush-100 bg-cream-50 shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-blush-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-blush-50 text-wine-700">
            <Icon className="size-[15px]" strokeWidth={2} />
          </span>
          <h3 className="text-[13px] font-semibold tracking-tight text-plum-900">
            {title}
          </h3>
        </div>
        {meta && <span className="label-xs text-ink-300">{meta}</span>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function WeightCard({ stats }) {
  const totalGrams = stats.weights.reduce((s, w) => s + w.grams, 0);

  return (
    <SectionCard icon={Scale} title="Sweets by weight" meta={formatWeight(totalGrams)}>
      <ul className="space-y-4">
        {stats.weights.map(({ name, grams }) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink-800">{name}</span>
              <span className="shrink-0 text-[13px] font-semibold text-plum-900 tabular-nums">
                {formatWeight(grams)}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
              <div
                className="bar-fill h-full rounded-full bg-linear-to-r from-wine-700 to-wine-400"
                style={{ width: `${(grams / stats.maxWeight) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function BoxCard({ stats }) {
  return (
    <SectionCard
      icon={Boxes}
      title="Box distribution"
      meta={`${stats.totalBoxes} total`}
    >
      {stats.boxes.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-300">
          No boxes recorded yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stats.boxes.map(({ itemName, weight, count }) => (
            <li
              key={`${itemName}-${weight}`}
              className="tap flex items-center justify-between gap-3 rounded-xl border border-blush-100/80 bg-blush-50/40 px-3.5 py-2.5 hover:border-blush-200 hover:bg-blush-50"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink-800">
                  {itemName}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                  {weightLabel(weight)} pack
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-plum-900 px-2.5 py-1 text-[11px] font-semibold text-cream-50 tabular-nums">
                {count}
                <span className="ml-1 font-normal text-blush-300">
                  {count === 1 ? 'box' : 'boxes'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ───────────────── loading ───────────────── */

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-20" rounded="rounded-full" />
        <Skeleton className="h-8 w-40" rounded="rounded-lg" />
        <Skeleton className="h-3 w-28" rounded="rounded-full" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[218px] lg:col-span-7 xl:col-span-8" rounded="rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-5 xl:col-span-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[101px]" rounded="rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 lg:col-span-5" rounded="rounded-2xl" />
        <Skeleton className="h-56 lg:col-span-7" rounded="rounded-2xl" />
      </div>
    </div>
  );
}
