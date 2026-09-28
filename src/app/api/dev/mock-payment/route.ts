import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, HttpError, parseBody } from "@/lib/http";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders/service";

// Development-only simulated card processor. Disabled in production builds.
export const POST = handle(async (req: Request) => {
  if (process.env.NODE_ENV === "production" || process.env.PAYMENT_PROVIDER !== "mock") throw new HttpError(404, "Not found");
  const user = await apiUser();
  const { orderId, outcome } = await parseBody(req, z.object({ orderId: z.string(), outcome: z.enum(["succeed", "fail"]) }));
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payments: { where: { provider: "mock" }, take: 1 } },
  });
  const payment = order?.payments[0];
  if (!order || !payment) throw new HttpError(404, "Order not found.");

  const snap = {
    providerPaymentId: payment.providerPaymentId,
    amountCents: order.totalCents,
    methodType: "mock",
    cardBrand: "visa",
    last4: "4242",
  };
  if (outcome === "succeed") {
    await markOrderPaid(order.id, { ...snap, outcome: "succeeded", failureMessage: null }, "mock", "mock");
  } else {
    await markPaymentFailed(order.id, { ...snap, outcome: "failed", failureMessage: "Your card was declined. (test)" }, "FAILED", "mock");
  }
  return NextResponse.json({ ok: true });
});
