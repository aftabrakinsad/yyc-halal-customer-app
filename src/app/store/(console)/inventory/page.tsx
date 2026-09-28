import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { InventoryRow } from "@/components/store/InventoryRow";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  await requireStaff("manageInventory");
  const products = await db.product.findMany({
    where: { active: true },
    include: { inventory: true, unit: true, category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Inventory</h1>
        <p className="text-muted">
          Out of Stock items show as unavailable in the customer app right away. Tracked quantities go down automatically when paid orders are
          confirmed and go back up when an order is cancelled.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-cream text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Stock status</th>
              <th className="px-4 py-3 font-semibold">Quantity</th>
              <th className="px-4 py-3 font-semibold">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const qty = Number(p.inventory?.quantityOnHand ?? 0);
              const track = p.inventory?.trackQuantity ?? true;
              return (
                <InventoryRow
                  key={`${p.id}:${qty}:${track}:${p.inventory?.markedOutOfStock}`}
                  item={{
                    id: p.id,
                    name: p.name,
                    unitLabel: p.unit.label,
                    category: p.category?.name ?? "",
                    quantityOnHand: qty,
                    trackQuantity: track,
                    markedOutOfStock: p.inventory?.markedOutOfStock ?? false,
                    soldOut: track && qty < Number(p.unit.minQuantity),
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
