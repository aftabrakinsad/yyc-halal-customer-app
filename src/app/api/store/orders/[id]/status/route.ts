import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, STAFF_ROLES } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { updateOrderStatus } from "@/lib/orders/service";

type Ctx = { params: Promise<{ id: string }> };

// Store staff press "Ready for Pickup" / "Completed". Customers can never call this.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiUser(STAFF_ROLES);
  const { status } = await parseBody(req, z.object({ status: z.enum(["IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED"]) }));
  const order = await updateOrderStatus((await ctx.params).id, status, { id: staff.id, role: staff.role, ip: clientIp(req) });
  return NextResponse.json({ order });
});
