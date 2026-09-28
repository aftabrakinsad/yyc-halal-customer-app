import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, MANAGER_ROLES } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { createRefund } from "@/lib/orders/service";

type Ctx = { params: Promise<{ id: string }> };

const reason = z.string().max(300).optional();
const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FULL"), reason }),
  z.object({ type: z.literal("PARTIAL"), amountCents: z.number().int().positive(), reason }),
  z.object({
    type: z.literal("ITEM"),
    items: z.array(z.object({ orderItemId: z.string(), quantity: z.number().positive() })).min(1),
    reason,
  }),
]);

// Refunds are restricted to managers/admins. Amounts are recomputed and capped server-side.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(MANAGER_ROLES);
  const body = await parseBody(req, schema);
  const refund = await createRefund((await ctx.params).id, body, { id: staff.id, role: staff.role, ip: clientIp(req) });
  return NextResponse.json({ refund });
});
