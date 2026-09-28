import "server-only";
import type { Inventory, Product, Unit } from "@/generated/prisma/client";
import { toMilli } from "./money";

export type StockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

const LOW_STOCK_MILLI = 5000;

/** How much of a product can be sold right now, in milli-units (null = unlimited). */
export function availableMilli(inventory: Inventory | null): number | null {
  if (!inventory) return 0;
  if (inventory.markedOutOfStock) return 0;
  if (!inventory.trackQuantity) return null;
  return Math.max(0, toMilli(inventory.quantityOnHand.toString()));
}

export function stockState(inventory: Inventory | null, unit: Unit): StockState {
  const available = availableMilli(inventory);
  if (available === null) return "IN_STOCK";
  if (available < toMilli(unit.minQuantity.toString())) return "OUT_OF_STOCK";
  return available <= LOW_STOCK_MILLI ? "LOW_STOCK" : "IN_STOCK";
}

export type UnitRules = {
  code: string;
  label: string;
  description: string;
  allowsDecimal: boolean;
  step: number;
  min: number;
  max: number;
};

export function unitRules(unit: Unit): UnitRules {
  return {
    code: unit.code,
    label: unit.label,
    description: unit.description,
    allowsDecimal: unit.allowsDecimal,
    step: Number(unit.step),
    min: Number(unit.minQuantity),
    max: Number(unit.maxQuantity),
  };
}

/** Product shape that is safe to send to the browser. */
export type ProductDTO = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceCents: number;
  categoryId: string | null;
  unit: UnitRules;
  stock: StockState;
};

export function toProductDTO(p: Product & { unit: Unit; inventory: Inventory | null }): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    priceCents: p.priceCents,
    categoryId: p.categoryId,
    unit: unitRules(p.unit),
    stock: stockState(p.inventory, p.unit),
  };
}
