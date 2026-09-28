import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/payments/stripe";
import { applyRefundSucceeded, markRefundFailed, recordExternalRefund, syncPayment } from "@/lib/orders/service";

// Stripe → YYC Halal. Signature-verified; every handler is idempotent, and processed
// event ids are recorded so retries/duplicates are skipped.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (await db.webhookEvent.findUnique({ where: { id: event.id } })) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        // Re-read the PaymentIntent from Stripe rather than trusting the event body alone.
        await syncPayment(event.data.object.id, `webhook:${event.type}`);
        break;
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
        await handleRefund(event.data.object);
        break;
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // Stripe will retry
  }

  await db.webhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => {});
  return NextResponse.json({ received: true });
}

async function handleRefund(refund: Stripe.Refund) {
  const localId = refund.metadata?.refundId;
  const local = localId
    ? await db.refund.findUnique({ where: { id: localId } })
    : await db.refund.findUnique({ where: { providerRefundId: refund.id } });

  if (local) {
    if (!local.providerRefundId) await db.refund.update({ where: { id: local.id }, data: { providerRefundId: refund.id } });
    if (refund.status === "succeeded") await applyRefundSucceeded(local.id);
    else if (refund.status === "failed" || refund.status === "canceled") await markRefundFailed(local.id, refund.failure_reason ?? refund.status);
    return;
  }
  // A refund issued directly in the Stripe dashboard.
  const paymentIntent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (refund.status === "succeeded" && paymentIntent) await recordExternalRefund(paymentIntent, refund.id, refund.amount);
}
