import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";
import { syncPayment } from "@/lib/orders/service";

type Ctx = { params: Promise<{ id: string }> };

// Polled by the confirmation page. If the webhook hasn't arrived yet, ask the processor directly.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const find = () =>
    db.order.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, paymentStatus: true, orderNumber: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  let order = await find();
  if (!order) throw new HttpError(404, "Order not found.");

  const payment = order.payments[0];
  if (order.status === "AWAITING_PAYMENT" && payment?.provider === "stripe" && payment.status === "PENDING") {
    await syncPayment(payment.providerPaymentId, "confirmation-page");
    order = (await find())!;
  }
  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderNumber: order.orderNumber,
    failureMessage: order.payments[0]?.failureMessage ?? null,
  });
});
