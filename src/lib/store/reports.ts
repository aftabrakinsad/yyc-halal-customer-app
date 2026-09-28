import "server-only";
import { db } from "../db";
import { HttpError } from "../http";
import { TIME_ZONE, toMilli, fromMilli } from "../money";

// All report periods are calendar periods in Calgary time (America/Edmonton), not UTC.

export const PERIODS = ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom range",
};

type Ymd = { y: number; m: number; d: number };

function offsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - at.getTime();
}

/** The instant local midnight starts on a Calgary calendar day. */
function localMidnight({ y, m, d }: Ymd): Date {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(new Date(guess));
  t = guess - offsetMs(new Date(t)); // second pass settles daylight-saving transitions
  return new Date(t);
}

function addDays({ y, m, d }: Ymd, days: number): Ymd {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function todayKey() {
  return dayKey(new Date());
}

function parseDay(s: string | null | undefined): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const ymd = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return ymd.m >= 1 && ymd.m <= 12 && ymd.d >= 1 && ymd.d <= 31 ? ymd : null;
}

const fmtYmd = ({ y, m, d }: Ymd) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export type Range = { period: Period; start: Date; end: Date; fromDay: string; toDay: string };

/** Turns a period + anchor date (or custom from/to) into [start, end) instants. */
export function resolveRange(period: Period, date?: string | null, from?: string | null, to?: string | null): Range {
  const anchor = parseDay(date) ?? parseDay(todayKey())!;
  let first: Ymd;
  let afterLast: Ymd;
  switch (period) {
    case "daily":
      first = anchor;
      afterLast = addDays(anchor, 1);
      break;
    case "weekly": {
      const weekday = new Date(Date.UTC(anchor.y, anchor.m - 1, anchor.d)).getUTCDay(); // 0 = Sunday
      first = addDays(anchor, -((weekday + 6) % 7)); // weeks start on Monday
      afterLast = addDays(first, 7);
      break;
    }
    case "monthly":
      first = { y: anchor.y, m: anchor.m, d: 1 };
      afterLast = anchor.m === 12 ? { y: anchor.y + 1, m: 1, d: 1 } : { y: anchor.y, m: anchor.m + 1, d: 1 };
      break;
    case "quarterly": {
      const qm = Math.floor((anchor.m - 1) / 3) * 3 + 1;
      first = { y: anchor.y, m: qm, d: 1 };
      afterLast = qm === 10 ? { y: anchor.y + 1, m: 1, d: 1 } : { y: anchor.y, m: qm + 3, d: 1 };
      break;
    }
    case "yearly":
      first = { y: anchor.y, m: 1, d: 1 };
      afterLast = { y: anchor.y + 1, m: 1, d: 1 };
      break;
    case "custom": {
      const f = parseDay(from);
      const t = parseDay(to);
      if (!f || !t) throw new HttpError(400, "Choose a start and end date.");
      if (fmtYmd(f) > fmtYmd(t)) throw new HttpError(400, "The start date must be before the end date.");
      first = f;
      afterLast = addDays(t, 1);
      break;
    }
  }
  const start = localMidnight(first);
  const end = localMidnight(afterLast);
  if (end.getTime() - start.getTime() > 3 * 366 * 86_400_000) throw new HttpError(400, "Reports can cover at most 3 years.");
  return { period, start, end, fromDay: fmtYmd(first), toDay: fmtYmd(addDays(afterLast, -1)) };
}

export type SalesReport = Awaited<ReturnType<typeof buildReport>>;

/**
 * Sales figures for a range.
 * - Gross sales: product sales before tax on orders paid in the range.
 * - Refunds: money actually returned in the range (tax included).
 * - Net sales: gross sales minus the pre-tax part of those refunds. Refunded money is never counted as sales.
 */
export async function buildReport(range: Range) {
  const inRange = { gte: range.start, lt: range.end };
  const [orders, refunds, cancelledOrders] = await Promise.all([
    db.order.findMany({ where: { orderNumber: { not: null }, paidAt: inRange }, include: { items: true }, orderBy: { paidAt: "asc" } }),
    db.refund.findMany({
      where: { status: "SUCCEEDED", succeededAt: inRange },
      include: { order: { select: { orderNumber: true, totalCents: true, taxCents: true } }, createdBy: { select: { name: true } } },
      orderBy: { succeededAt: "asc" },
    }),
    db.order.count({ where: { orderNumber: { not: null }, cancelledAt: inRange } }),
  ]);

  const grossSalesCents = orders.reduce((s, o) => s + o.subtotalCents, 0);
  const taxCollectedCents = orders.reduce((s, o) => s + o.taxCents, 0);
  const totalCollectedCents = orders.reduce((s, o) => s + o.totalCents, 0);

  // Split each refund into its pre-tax and tax parts in proportion to the original order.
  const refundTax = (r: (typeof refunds)[number]) => (r.order.totalCents ? Math.round((r.amountCents * r.order.taxCents) / r.order.totalCents) : 0);
  const refundsCents = refunds.reduce((s, r) => s + r.amountCents, 0);
  const refundedTaxCents = refunds.reduce((s, r) => s + refundTax(r), 0);
  const netSalesCents = grossSalesCents - (refundsCents - refundedTaxCents);
  const netTaxCents = taxCollectedCents - refundedTaxCents;

  // Product breakdown (orders paid in range). Fully refunded / cancelled orders count as returned.
  const products = new Map<string, { name: string; unit: string; soldMilli: number; refundedMilli: number; grossCents: number; refundedCents: number }>();
  for (const o of orders) {
    const voided = o.status === "CANCELLED" || o.paymentStatus === "REFUNDED";
    for (const i of o.items) {
      const key = `${i.productId}|${i.unitLabel}`;
      const p = products.get(key) ?? { name: i.productName, unit: i.unitLabel, soldMilli: 0, refundedMilli: 0, grossCents: 0, refundedCents: 0 };
      const qty = toMilli(i.quantity.toString());
      p.soldMilli += qty;
      p.grossCents += i.lineSubtotalCents;
      p.refundedMilli += voided ? qty : toMilli(i.refundedQuantity.toString());
      p.refundedCents += voided ? i.lineSubtotalCents : i.refundedCents;
      products.set(key, p);
    }
  }
  const productRows = [...products.values()]
    .map((p) => ({
      name: p.name,
      unit: p.unit,
      quantitySold: fromMilli(p.soldMilli),
      quantityRefunded: fromMilli(p.refundedMilli),
      netQuantity: fromMilli(p.soldMilli - p.refundedMilli),
      grossCents: p.grossCents,
      refundedCents: p.refundedCents,
      netSalesCents: p.grossCents - p.refundedCents,
    }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents);

  // Time series: by day for ranges up to ~2 months, otherwise by month.
  const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000);
  const byMonth = days > 62;
  const bucketKey = (d: Date) => (byMonth ? dayKey(d).slice(0, 7) : dayKey(d));
  const buckets = new Map<string, { key: string; grossCents: number; refundsCents: number; orders: number }>();
  for (let t = range.start.getTime(); t < range.end.getTime(); t += 86_400_000 / 2) {
    const k = bucketKey(new Date(t));
    if (!buckets.has(k)) buckets.set(k, { key: k, grossCents: 0, refundsCents: 0, orders: 0 });
  }
  for (const o of orders) {
    const b = buckets.get(bucketKey(o.paidAt!));
    if (b) {
      b.grossCents += o.subtotalCents;
      b.orders += 1;
    }
  }
  for (const r of refunds) {
    const b = buckets.get(bucketKey(r.succeededAt!));
    if (b) b.refundsCents += r.amountCents - refundTax(r);
  }
  const series = [...buckets.values()].map((b) => ({ ...b, netCents: b.grossCents - b.refundsCents }));

  return {
    range: { period: range.period, fromDay: range.fromDay, toDay: range.toDay, start: range.start.toISOString(), end: range.end.toISOString() },
    generatedAt: new Date().toISOString(),
    summary: {
      grossSalesCents,
      taxCollectedCents,
      totalCollectedCents,
      refundsCents,
      refundedTaxCents,
      netSalesCents,
      netTaxCents,
      orderCount: orders.length,
      averageOrderCents: orders.length ? Math.round(totalCollectedCents / orders.length) : 0,
      refundedOrderCount: new Set(refunds.map((r) => r.orderId)).size,
      cancelledOrderCount: cancelledOrders,
    },
    products: productRows,
    bestSellers: productRows.filter((p) => p.netSalesCents > 0).slice(0, 5),
    series: { granularity: byMonth ? ("month" as const) : ("day" as const), points: series },
    refunds: refunds.map((r) => ({
      id: r.id,
      date: r.succeededAt!.toISOString(),
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      type: r.type,
      amountCents: r.amountCents,
      reasonCategory: r.reasonCategory,
      reason: r.reason,
      employee: r.createdBy?.name ?? "Payment provider",
      providerRefundId: r.providerRefundId,
    })),
  };
}

/** Live numbers for the top of the dashboard (today, Calgary time). */
export async function todayStats() {
  const { start, end } = resolveRange("daily");
  const today = { gte: start, lt: end };
  const [paid, inProgress, ready, completedToday, refunds] = await Promise.all([
    db.order.aggregate({ where: { orderNumber: { not: null }, paidAt: today }, _sum: { totalCents: true }, _count: true }),
    db.order.count({ where: { status: "IN_PROGRESS" } }),
    db.order.count({ where: { status: "READY_FOR_PICKUP" } }),
    db.order.count({ where: { status: "COMPLETED", completedAt: today } }),
    db.refund.aggregate({ where: { status: "SUCCEEDED", succeededAt: today }, _sum: { amountCents: true } }),
  ]);
  const salesCents = paid._sum.totalCents ?? 0;
  return {
    salesCents,
    orders: paid._count,
    inProgress,
    ready,
    completedToday,
    refundsCents: refunds._sum.amountCents ?? 0,
    averageOrderCents: paid._count ? Math.round(salesCents / paid._count) : 0,
  };
}
