import { NextResponse } from "next/server";
import { apiUser, MANAGER_ROLES } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/http";
import { flyerSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(MANAGER_ROLES);
  const { id } = await ctx.params;
  const flyer = await db.flyer.update({ where: { id }, data: await parseBody(req, flyerSchema.partial()) });
  await audit({ actorId: staff.id, actorRole: staff.role, ip: clientIp(req), action: "FLYER_UPDATED", entityType: "Flyer", entityId: id });
  return NextResponse.json({ flyer });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(MANAGER_ROLES);
  const { id } = await ctx.params;
  await db.flyer.delete({ where: { id } });
  await audit({ actorId: staff.id, actorRole: staff.role, ip: clientIp(req), action: "FLYER_DELETED", entityType: "Flyer", entityId: id });
  return NextResponse.json({ ok: true });
});
