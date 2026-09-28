import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { activeFlyers } from "@/lib/content";
import { db } from "@/lib/db";
import { FlyerCard } from "@/components/FlyerCard";
import { ChevronRightIcon, StoreIcon } from "@/components/icons";
import { ORDER_STATUS_LABEL } from "@/lib/labels";

export default async function HomePage() {
  const user = await requireUser();
  const [flyers, activeOrder] = await Promise.all([
    activeFlyers(),
    db.order.findFirst({
      where: { userId: user.id, status: { in: ["IN_PROGRESS", "READY_FOR_PICKUP"] } },
      orderBy: { paidAt: "desc" },
      select: { id: true, orderNumber: true, status: true },
    }),
  ]);
  const [featured, ...rest] = flyers;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted">Welcome, {user.name.split(" ")[0]}</p>
          <h1 className="page-title">Fresh deals at YYC Halal</h1>
        </div>
        <Link href="/order" className="btn-primary btn-lg sm:w-auto">
          <StoreIcon /> Start your order
        </Link>
      </section>

      {activeOrder && (
        <Link
          href={`/orders/${activeOrder.id}`}
          className={`flex items-center gap-4 rounded-2xl p-4 font-semibold ${
            activeOrder.status === "READY_FOR_PICKUP" ? "bg-gold-400 text-ink" : "bg-brand-100 text-brand-800"
          }`}
        >
          <span className="flex-1">
            <span className="block text-sm opacity-80">Order #{activeOrder.orderNumber}</span>
            <span className="block text-lg font-extrabold">{ORDER_STATUS_LABEL[activeOrder.status]}</span>
          </span>
          <span className="inline-flex items-center">
            Track <ChevronRightIcon />
          </span>
        </Link>
      )}

      {featured ? (
        <>
          <FlyerCard flyer={featured} featured />
          {rest.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((f) => (
                <li key={f.id}>
                  <FlyerCard flyer={f} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold">No flyers right now</h2>
          <p className="mt-1 text-muted">Check back soon for sales and specials. Our full selection is always available to order.</p>
        </div>
      )}
    </div>
  );
}
