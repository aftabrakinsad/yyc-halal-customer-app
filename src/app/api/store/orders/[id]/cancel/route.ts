import { NextResponse } from "next/server";
import { actorOf, apiStaff } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { cancelOrder } from "@/lib/orders/service";
import { cancelSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

// "Cancel & Refund Entire Order" — full refund to the original payment method, stock returned.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiStaff("cancelOrder");
  rateLimit(`refund:${staff.id}`, 10, 60_000);
  const { confirmOrderNumber, expectedAmountCents, ...reasons } = await parseBody(req, cancelSchema);
  const order = await cancelOrder((await ctx.params).id, actorOf(staff, clientIp(req)), reasons, { confirmOrderNumber, expectedAmountCents });
  return NextResponse.json({ order });
});
