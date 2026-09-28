import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { formatDateTime, formatMoney } from "@/lib/money";
import { searchOrders } from "@/lib/store/orders";
import { OrderSearch } from "@/components/store/OrderSearch";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = [
  { label: "All", status: "", payment: "" },
  { label: "In Progress", status: "IN_PROGRESS", payment: "" },
  { label: "Ready for Pickup", status: "READY_FOR_PICKUP", payment: "" },
  { label: "Completed", status: "COMPLETED", payment: "" },
  { label: "Cancelled", status: "CANCELLED", payment: "" },
  { label: "Refunded", status: "", payment: "REFUNDED" },
  { label: "Partially refunded", status: "", payment: "PARTIALLY_REFUNDED" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/store/orders">) {
  await requireStaff("viewOrders");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const payment = typeof sp.payment === "string" ? sp.payment : "";
  const orders = await searchOrders({ q, status, payment, limit: 200 });

  const href = (f: (typeof FILTERS)[number]) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (f.status) p.set("status", f.status);
    if (f.payment) p.set("payment", f.payment);
    return `/store/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Orders</h1>
      <OrderSearch defaultValue={q} autoFocus />
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filter orders">
        {FILTERS.map((f) => {
          const active = f.status === status && f.payment === payment;
          return (
            <Link
              key={f.label}
              href={href(f)}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold ${
                active ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-200"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p className="text-muted" role="status">
        {orders.length} order{orders.length === 1 ? "" : "s"}
        {q && ` matching “${q}”`}
      </p>

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-line bg-cream text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-brand-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/store/orders/${o.id}`} className="font-extrabold text-brand-700 underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDateTime(o.paidAt ?? o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{o.customerName}</span>
                    <span className="block text-sm text-muted">{o.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3">{o.items.length}</td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    {formatMoney(o.totalCents - o.refundedCents)}
                    {o.refundedCents > 0 && <span className="block text-sm font-normal text-muted line-through">{formatMoney(o.totalCents)}</span>}
                  </td>
                  <td className="space-y-1 px-4 py-3">
                    <OrderStatusBadge status={o.status} /> <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
