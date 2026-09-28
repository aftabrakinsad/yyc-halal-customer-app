import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/http";

export const GET = handle(async () => {
  const user = await apiUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notifications });
});

// Mark notifications as read: { ids: [...] } or { all: true }.
export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const body = await parseBody(req, z.object({ ids: z.array(z.string()).max(100).optional(), all: z.boolean().optional() }));
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(body.all ? {} : { id: { in: body.ids ?? [] } }) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
