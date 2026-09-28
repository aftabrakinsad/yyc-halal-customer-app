import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, MANAGER_ROLES, STAFF_ROLES } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const GET = handle(async () => {
  await apiUser(STAFF_ROLES);
  return NextResponse.json(await getSettings());
});

const schema = z
  .object({
    storeName: z.string().min(1).max(100),
    addressLine: z.string().max(200),
    phone: z.string().max(40),
    email: z.string().max(120),
    taxRateBps: z.number().int().min(0).max(3000), // the tax rate is data, never hard-coded
    taxLabel: z.string().min(1).max(30),
    pickupInstructions: z.string().max(500),
    receiptFooter: z.string().max(300),
    autoPrintReceipts: z.boolean(),
    emailWhenReady: z.boolean(),
    acceptingOrders: z.boolean(),
  })
  .partial();

export const PATCH = handle(async (req: Request) => {
  const staff = await apiUser(MANAGER_ROLES);
  const data = await parseBody(req, schema);
  const before = await getSettings();
  const settings = await db.storeSettings.update({ where: { id: 1 }, data });
  await audit({
    actorId: staff.id,
    actorRole: staff.role,
    ip: clientIp(req),
    action: "SETTINGS_UPDATED",
    entityType: "StoreSettings",
    entityId: "1",
    data: { changes: Object.fromEntries(Object.keys(data).map((k) => [k, { from: before[k as keyof typeof before], to: data[k as keyof typeof data] }])) },
  });
  return NextResponse.json(settings);
});
