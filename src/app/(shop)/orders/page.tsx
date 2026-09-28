import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/money";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { ChevronRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id, orderNumber: { not: null } },
    orderBy: { paidAt: "desc" },
    select: { id: true, orderNumber: true, paidAt: true, createdAt: true, totalCents: true, refundedCents: true, status: true, paymentStatus: true },
  });
  const active = orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "READY_FOR_PICKUP");
  const past = orders.filter((o) => !active.includes(o));

  const list = (items: typeof orders) => (
    <ul className="space-y-3">
      {items.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="card flex items-center gap-3 p-4 hover:border-brand-200">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg font-extrabold tracking-wide">#{o.orderNumber}</p>
              <p className="text-muted">{formatDate(o.paidAt ?? o.createdAt)}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <OrderStatusBadge status={o.status} />
                <PaymentStatusBadge status={o.paymentStatus} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold">{formatMoney(o.totalCents - o.refundedCents)}</p>
              {o.refundedCents > 0 && <p className="text-sm text-muted line-through">{formatMoney(o.totalCents)}</p>}
            </div>
            <ChevronRightIcon className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold">You haven&apos;t placed any orders yet.</p>
          <Link href="/order" className="btn-primary btn-lg mt-4">
            Start your first order
          </Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="active-heading" className="space-y-3">
            <h2 id="active-heading" className="text-xl font-bold">
              Active orders
            </h2>
            {active.length ? list(active) : <p className="text-muted">No active orders right now.</p>}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past-heading" className="space-y-3">
              <h2 id="past-heading" className="text-xl font-bold">
                Completed &amp; past orders
              </h2>
              {list(past)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
