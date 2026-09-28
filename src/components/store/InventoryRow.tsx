"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { storePost } from "./api";

export type InventoryItem = {
  id: string;
  name: string;
  unitLabel: string;
  category: string;
  quantityOnHand: number;
  trackQuantity: boolean;
  markedOutOfStock: boolean;
  soldOut: boolean;
};

/** One-tap In Stock / Out of Stock, plus optional available quantity. Customers see changes immediately. */
export function InventoryRow({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const toast = useToast();
  const [qty, setQty] = useState(String(item.quantityOnHand));
  const [busy, setBusy] = useState(false);

  const save = async (inventory: Partial<Pick<InventoryItem, "quantityOnHand" | "trackQuantity" | "markedOutOfStock">>, message: string) => {
    setBusy(true);
    try {
      await storePost(`/api/store/products/${item.id}`, { inventory }, "PATCH");
      toast({ title: message });
      router.refresh();
    } catch (e) {
      toast({ title: "Couldn't update stock", body: (e as Error).message, tone: "info" });
    } finally {
      setBusy(false);
    }
  };

  const out = item.markedOutOfStock || item.soldOut;
  return (
    <tr className={out ? "bg-accent-50/40" : ""}>
      <td className="px-4 py-3">
        <span className="block font-bold">{item.name}</span>
        <span className="block text-sm text-muted">{item.category}</span>
      </td>
      <td className="px-4 py-3">
        <div className="inline-flex overflow-hidden rounded-xl border-2 border-line" role="group" aria-label={`Stock status for ${item.name}`}>
          <button
            type="button"
            disabled={busy}
            aria-pressed={!item.markedOutOfStock}
            onClick={() => save({ markedOutOfStock: false }, `${item.name} marked In Stock`)}
            className={`min-h-11 px-4 font-bold ${!item.markedOutOfStock ? "bg-brand-600 text-white" : "bg-white text-muted hover:bg-brand-50"}`}
          >
            In Stock
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={item.markedOutOfStock}
            onClick={() => save({ markedOutOfStock: true }, `${item.name} marked Out of Stock`)}
            className={`min-h-11 px-4 font-bold ${item.markedOutOfStock ? "bg-accent-500 text-white" : "bg-white text-muted hover:bg-accent-50"}`}
          >
            Out of Stock
          </button>
        </div>
        {item.soldOut && !item.markedOutOfStock && <p className="mt-1 text-sm font-semibold text-accent-500">Sold out (0 available)</p>}
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.trackQuantity}
            disabled={busy}
            onChange={(e) => save({ trackQuantity: e.target.checked }, e.target.checked ? "Tracking quantity" : "Quantity tracking off")}
            className="h-6 w-6 accent-brand-600"
          />
          <span className="text-sm font-semibold">Track</span>
        </label>
      </td>
      <td className="px-4 py-3">
        {item.trackQuantity ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(qty);
              if (Number.isFinite(n) && n >= 0) save({ quantityOnHand: n }, `${item.name}: ${n} ${item.unitLabel} available`);
            }}
          >
            <input
              type="number"
              min={0}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label={`Available ${item.unitLabel} of ${item.name}`}
              className="input w-28"
            />
            <span className="text-muted">{item.unitLabel}</span>
            <button className="btn-secondary min-h-11 px-3 text-sm" disabled={busy || Number(qty) === item.quantityOnHand}>
              Save
            </button>
          </form>
        ) : (
          <span className="text-sm text-muted">Unlimited</span>
        )}
      </td>
    </tr>
  );
}
