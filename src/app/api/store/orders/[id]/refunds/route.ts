import { NextResponse } from "next/server";
import { actorOf, apiStaff } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createRefund } from "@/lib/orders/service";
import { refundSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

// Refunds real money: manager/admin only, amount recomputed server-side and checked against what was confirmed.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiStaff("refund");
  rateLimit(`refund:${staff.id}`, 10, 60_000);
  const { confirmOrderNumber, expectedAmountCents, ...request } = await parseBody(req, refundSchema);
  const refund = await createRefund((await ctx.params).id, request, actorOf(staff, clientIp(req)), { confirmOrderNumber, expectedAmountCents });
  return NextResponse.json({ refund });
});
