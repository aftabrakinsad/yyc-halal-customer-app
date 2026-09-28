import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Manual reprint: queues the receipt for the store's POS printer. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const staff = await apiStaff("printReceipt");
  const { id } = await ctx.params;
  const order = await db.order.findFirst({ where: { id, orderNumber: { not: null } }, select: { id: true, orderNumber: true } });
  if (!order) throw new HttpError(404, "Order not found.");
  const job = await db.printJob.create({ data: { orderId: id, kind: "RECEIPT" } });
  await audit({
    actorId: staff.id,
    actorRole: staff.role,
    ip: clientIp(req),
    action: "RECEIPT_REPRINTED",
    entityType: "Order",
    entityId: id,
    data: { orderNumber: order.orderNumber, printJobId: job.id },
  });
  return NextResponse.json({ job });
});
