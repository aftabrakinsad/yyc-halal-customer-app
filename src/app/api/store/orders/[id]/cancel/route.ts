import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, MANAGER_ROLES } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { cancelOrder } from "@/lib/orders/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(MANAGER_ROLES);
  const { reason } = await parseBody(req, z.object({ reason: z.string().max(300).optional() }));
  const order = await cancelOrder((await ctx.params).id, { id: staff.id, role: staff.role, ip: clientIp(req) }, reason);
  return NextResponse.json({ order });
});
