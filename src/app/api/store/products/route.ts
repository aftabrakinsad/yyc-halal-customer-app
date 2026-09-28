import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/http";
import { productSchema, inventorySchema } from "@/lib/store-schemas";

export const GET = handle(async () => {
  await apiStaff("viewOrders");
  const products = await db.product.findMany({ include: { unit: true, inventory: true, category: true }, orderBy: { name: "asc" } });
  const units = await db.unit.findMany();
  return NextResponse.json({ products, units });
});

export const POST = handle(async (req: Request) => {
  const staff = await apiStaff("manageProducts");
  const { inventory, ...data } = await parseBody(req, productSchema.extend({ inventory: inventorySchema.optional() }));
  const product = await db.product.create({ data: { ...data, inventory: { create: inventory ?? {} } } });
  await audit({ actorId: staff.id, actorRole: staff.role, ip: clientIp(req), action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id, data });
  return NextResponse.json({ product }, { status: 201 });
});
