import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError, parseBody } from "@/lib/http";
import { can } from "@/lib/permissions";
import { inventorySchema, productUpdateSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

// Product details need "manageProducts"; stock changes need "manageInventory".
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser();
  const { id } = await ctx.params;
  const { inventory, ...data } = await parseBody(req, productUpdateSchema.extend({ inventory: inventorySchema.optional() }));
  if (Object.keys(data).length && !can(staff.role, "manageProducts")) throw new HttpError(403, "You don't have permission to edit products.");
  if (inventory && !can(staff.role, "manageInventory")) throw new HttpError(403, "You don't have permission to change inventory.");

  const before = await db.product.findUnique({ where: { id }, include: { inventory: true } });
  if (!before) throw new HttpError(404, "Product not found.");
  const product = await db.product.update({
    where: { id },
    data: {
      ...data,
      ...(inventory ? { inventory: { upsert: { create: inventory, update: inventory } } } : {}),
    },
    include: { inventory: true },
  });

  const base = { actorId: staff.id, actorRole: staff.role, ip: clientIp(req), entityType: "Product", entityId: id };
  if (data.priceCents !== undefined && data.priceCents !== before.priceCents) {
    await audit({ ...base, action: "PRICE_CHANGED", data: { product: before.name, from: before.priceCents, to: data.priceCents } });
  }
  const otherChanges = Object.fromEntries(Object.entries(data).filter(([k]) => k !== "priceCents"));
  if (Object.keys(otherChanges).length) await audit({ ...base, action: "PRODUCT_EDITED", data: { product: product.name, changes: otherChanges } });
  if (inventory) {
    await audit({
      ...base,
      action: "INVENTORY_CHANGED",
      data: {
        product: product.name,
        from: before.inventory
          ? { quantityOnHand: Number(before.inventory.quantityOnHand), trackQuantity: before.inventory.trackQuantity, markedOutOfStock: before.inventory.markedOutOfStock }
          : null,
        to: inventory,
      },
    });
  }
  return NextResponse.json({ product });
});
