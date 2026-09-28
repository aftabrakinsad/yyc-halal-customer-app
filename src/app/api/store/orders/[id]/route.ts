import { NextResponse } from "next/server";
import { apiUser, STAFF_ROLES } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";
import { loadReceipt } from "@/lib/receipt";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await apiUser(STAFF_ROLES);
  const { id } = await ctx.params;
  const receipt = await loadReceipt(id);
  if (!receipt) throw new HttpError(404, "Order not found.");
  const auditTrail = await db.auditLog.findMany({ where: { entityType: "Order", entityId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ...receipt, auditTrail });
});
