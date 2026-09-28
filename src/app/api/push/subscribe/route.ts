import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/http";

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const { endpoint, keys } = await parseBody(req, subscription);
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser();
  const { endpoint } = await parseBody(req, z.object({ endpoint: z.string() }));
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
});
