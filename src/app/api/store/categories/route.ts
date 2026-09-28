import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/http";

export const GET = handle(async () => {
  await apiStaff("viewOrders");
  return NextResponse.json({ categories: await db.category.findMany({ orderBy: { sortOrder: "asc" } }) });
});

export const POST = handle(async (req: Request) => {
  const staff = await apiStaff("manageProducts");
  const { name } = await parseBody(req, z.object({ name: z.string().trim().min(1).max(60) }));
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";
  const max = await db.category.aggregate({ _max: { sortOrder: true } });
  const category = await db.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  await audit({ actorId: staff.id, actorRole: staff.role, ip: clientIp(req), action: "CATEGORY_CREATED", entityType: "Category", entityId: category.id, data: { name } });
  return NextResponse.json({ category }, { status: 201 });
});
