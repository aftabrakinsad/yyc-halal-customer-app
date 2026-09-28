import { NextResponse } from "next/server";
import { apiUser, MANAGER_ROLES, STAFF_ROLES } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError, parseBody } from "@/lib/http";
import { inventorySchema, productSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

// Employees may update stock; price/catalog changes need a manager.
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(STAFF_ROLES);
  const { id } = await ctx.params;
  const { inventory, ...data } = await parseBody(req, productSchema.partial().extend({ inventory: inventorySchema.optional() }));
  if (Object.keys(data).length && !MANAGER_ROLES.includes(staff.role)) {
    throw new HttpError(403, "Only managers can change product details or prices.");
  }
  const product = await db.product.update({
    where: { id },
    data: {
      ...data,
      ...(inventory ? { inventory: { upsert: { create: inventory, update: inventory } } } : {}),
    },
    include: { inventory: true },
  });
  await audit({
    actorId: staff.id,
    actorRole: staff.role,
    ip: clientIp(req),
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: id,
    data: { ...data, inventory },
  });
  return NextResponse.json({ product });
});
