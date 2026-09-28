import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { availableMilli, unitRules, type UnitRules } from "./catalog";
import { fromMilli, lineTotalCents, taxCents, toMilli } from "./money";

// The browser only ever sends product ids and quantities. Every price, tax and total
// shown at checkout or charged to a card is computed here from the database.

export const cartItemsSchema = z
  .array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().positive().max(10000) }))
  .min(1)
  .max(100);

export type CartItemInput = z.infer<typeof cartItemsSchema>[number];

export type QuotedLine = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unit: UnitRules;
  unitPriceCents: number;
  quantity: number;
  quantityMilli: number;
  lineSubtotalCents: number;
  taxable: boolean;
};

export type CartProblem = {
  productId: string;
  name?: string;
  code: "NOT_FOUND" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "INVALID_QUANTITY";
  message: string;
  availableQuantity?: number;
};

export type Quote = {
  lines: QuotedLine[];
  problems: CartProblem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  taxRateBps: number;
  taxLabel: string;
  currency: string;
  acceptingOrders: boolean;
};

type Tx = Prisma.TransactionClient;

export async function quoteCart(items: CartItemInput[], tx: Tx = db): Promise<Quote> {
  const settings = await getSettings();

  // Merge duplicate lines for the same product.
  const wanted = new Map<string, number>();
  for (const item of items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + toMilli(item.quantity));

  const products = await tx.product.findMany({
    where: { id: { in: [...wanted.keys()] } },
    include: { unit: true, inventory: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: QuotedLine[] = [];
  const problems: CartProblem[] = [];

  for (const [productId, quantityMilli] of wanted) {
    const product = byId.get(productId);
    if (!product || !product.active) {
      problems.push({ productId, code: "NOT_FOUND", message: "This product is no longer available." });
      continue;
    }
    const unit = unitRules(product.unit);
    const stepMilli = toMilli(unit.step);
    const quantityOk =
      quantityMilli >= toMilli(unit.min) &&
      quantityMilli <= toMilli(unit.max) &&
      (unit.allowsDecimal ? quantityMilli % stepMilli === 0 : quantityMilli % 1000 === 0);
    if (!quantityOk) {
      problems.push({
        productId,
        name: product.name,
        code: "INVALID_QUANTITY",
        message: `Choose between ${unit.min} and ${unit.max} ${unit.label}${unit.allowsDecimal ? ` in steps of ${unit.step}` : ""}.`,
      });
      continue;
    }
    const available = availableMilli(product.inventory);
    if (available !== null && available < quantityMilli) {
      const outOfStock = available < toMilli(unit.min);
      problems.push({
        productId,
        name: product.name,
        code: outOfStock ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
        message: outOfStock ? "Out of stock." : `Only ${fromMilli(available)} ${unit.label} left.`,
        availableQuantity: outOfStock ? 0 : fromMilli(available),
      });
      continue;
    }
    lines.push({
      productId,
      name: product.name,
      imageUrl: product.imageUrl,
      unit,
      unitPriceCents: product.priceCents,
      quantity: fromMilli(quantityMilli),
      quantityMilli,
      lineSubtotalCents: lineTotalCents(product.priceCents, quantityMilli),
      taxable: product.taxable,
    });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineSubtotalCents, 0);
  const taxableCents = lines.filter((l) => l.taxable).reduce((sum, l) => sum + l.lineSubtotalCents, 0);
  const tax = taxCents(taxableCents, settings.taxRateBps);

  return {
    lines,
    problems,
    subtotalCents,
    taxCents: tax,
    totalCents: subtotalCents + tax,
    taxRateBps: settings.taxRateBps,
    taxLabel: settings.taxLabel,
    currency: settings.currency,
    acceptingOrders: settings.acceptingOrders,
  };
}

/** Stable fingerprint of a priced cart, used to detect a changed cart on checkout retry. */
export function cartHash(quote: Quote): string {
  const key = quote.lines
    .map((l) => `${l.productId}:${l.quantityMilli}:${l.unitPriceCents}`)
    .sort()
    .join("|");
  return createHash("sha256").update(`${key}#${quote.taxRateBps}`).digest("hex");
}
