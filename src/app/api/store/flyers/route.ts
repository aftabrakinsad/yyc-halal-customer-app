import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/http";
import { flyerSchema } from "@/lib/store-schemas";

export const GET = handle(async () => {
  await apiStaff("manageFlyers");
  return NextResponse.json({ flyers: await db.flyer.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }) });
});

export const POST = handle(async (req: Request) => {
  const staff = await apiStaff("manageFlyers");
  const flyer = await db.flyer.create({ data: await parseBody(req, flyerSchema) });
  await audit({ actorId: staff.id, actorRole: staff.role, ip: clientIp(req), action: "FLYER_CREATED", entityType: "Flyer", entityId: flyer.id });
  return NextResponse.json({ flyer }, { status: 201 });
});
