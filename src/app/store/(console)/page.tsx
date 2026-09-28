import { requireStaff } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { searchOrders, toCard } from "@/lib/store/orders";
import { todayStats } from "@/lib/store/reports";
import { OrderCard } from "@/components/store/OrderCard";
import { OrderSearch } from "@/components/store/OrderSearch";
import { StatTiles } from "@/components/store/StatTiles";

/** Order preparation screen: only In Progress and Ready for Pickup orders; completed ones drop off. */
export default async function StoreDashboard({ searchParams }: PageProps<"/store">) {
  const user = await requireStaff("viewOrders");
  const { denied } = await searchParams;
  const [orders, stats] = await Promise.all([searchOrders({ status: "IN_PROGRESS,READY_FOR_PICKUP", limit: 200 }), todayStats()]);
  const byOldest = (a: { paidAt: Date | null }, b: { paidAt: Date | null }) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0);
  const preparing = orders.filter((o) => o.status === "IN_PROGRESS").sort(byOldest).map(toCard);
  const ready = orders.filter((o) => o.status === "READY_FOR_PICKUP").sort(byOldest).map(toCard);
  const manager = can(user.role, "viewFinancialStats");

  const grid = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    <div className="space-y-6">
      {denied && (
        <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          Your role doesn&apos;t have access to that section.
        </p>
      )}
      <StatTiles
        stats={[
          { label: "Today's Sales", value: formatMoney(stats.salesCents) },
          { label: "Today's Orders", value: String(stats.orders) },
          { label: "Orders In Progress", value: String(stats.inProgress), tone: "green" },
          { label: "Ready for Pickup", value: String(stats.ready), tone: "gold" },
          { label: "Completed Today", value: String(stats.completedToday) },
          ...(manager
            ? [
                { label: "Refunds Today", value: formatMoney(stats.refundsCents) },
                { label: "Average Order", value: formatMoney(stats.averageOrderCents) },
              ]
            : []),
        ]}
      />
      <OrderSearch />

      <section aria-labelledby="prep-heading" className="space-y-3">
        <h1 id="prep-heading" className="text-2xl font-black">
          In Progress <span className="text-muted">({preparing.length})</span>
        </h1>
        {preparing.length ? (
          <ul className={grid}>
            {preparing.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line bg-white p-8 text-center text-lg text-muted">
            No orders to prepare. New paid orders appear here automatically.
          </p>
        )}
      </section>

      <section aria-labelledby="ready-heading" className="space-y-3">
        <h2 id="ready-heading" className="text-2xl font-black">
          Ready for Pickup <span className="text-muted">({ready.length})</span>
        </h2>
        {ready.length ? (
          <ul className={grid}>
            {ready.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nothing waiting for pickup.</p>
        )}
      </section>
    </div>
  );
}
