import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentStatus, RefundType } from "@/generated/prisma/enums";
import { db } from "../db";
import { audit } from "../audit";
import { HttpError } from "../http";
import { getSettings } from "../settings";
import { cartHash, quoteCart, type CartItemInput, type Quote } from "../pricing";
import { formatMoney, lineTotalCents, taxCents, TIME_ZONE, toMilli, fromMilli } from "../money";
import { paymentProvider, providerFor, type PaymentSnapshot } from "../payments";
import { createNotification, pushNotification } from "../notify";
import { loadReceipt } from "../receipt";
import { sendMail } from "../email";
import { readyEmail, receiptEmail, refundEmail } from "../emails/templates";

type Tx = Prisma.TransactionClient;

export type Actor = { id: string | null; role: string; ip?: string | null };
export const SYSTEM: Actor = { id: null, role: "SYSTEM" };

const PAID_STATES: PaymentStatus[] = ["PAID", "PARTIALLY_REFUNDED"];

/** Row lock so concurrent webhooks / staff actions on one order apply one at a time. */
async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

function auditBy(actor: Actor) {
  return { actorId: actor.id, actorRole: actor.role, ip: actor.ip ?? null };
}

// ───────────────────────────── Order numbers ─────────────────────────────

/** Atomically issues the next number for the current year, e.g. YYC-2026-001245. Never repeats. */
export async function nextOrderNumber(tx: Tx): Promise<string> {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    INSERT INTO "OrderCounter" ("year", "lastValue") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "lastValue" = "OrderCounter"."lastValue" + 1
    RETURNING "lastValue"`;
  return `YYC-${year}-${String(rows[0].lastValue).padStart(6, "0")}`;
}

// ───────────────────────────── Checkout ─────────────────────────────

export type CheckoutResult =
  | { kind: "payment"; orderId: string; provider: "stripe" | "mock"; clientSecret: string | null; quote: Quote }
  | { kind: "already_paid"; orderId: string };

/**
 * Creates (or resumes) the draft order + payment for a confirmed checkout.
 * `checkoutKey` is an idempotency key from the checkout screen: refreshing or double-tapping
 * "Confirm" returns the same draft order and the same payment, never a second charge.
 */
export async function startCheckout(
  user: { id: string; name: string; email: string },
  items: CartItemInput[],
  checkoutKey: string,
  ip: string | null,
): Promise<CheckoutResult> {
  const settings = await getSettings();
  if (!settings.acceptingOrders) throw new HttpError(409, "The store isn't accepting online orders right now.");

  const quote = await quoteCart(items);
  if (quote.problems.length) {
    throw new HttpError(409, "Some items in your cart need attention.", { code: "CART_PROBLEMS", problems: quote.problems });
  }
  if (!quote.lines.length) throw new HttpError(400, "Your cart is empty.");
  if (quote.totalCents < 50) throw new HttpError(400, "The minimum order is $0.50.");
  const hash = cartHash(quote);
  const provider = paymentProvider();

  const findExisting = () =>
    db.order.findUnique({ where: { checkoutKey }, include: { payments: { orderBy: { createdAt: "desc" } } } });

  let order = await findExisting();
  if (!order) {
    try {
      order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: user.id,
            customerName: user.name,
            customerEmail: user.email,
            subtotalCents: quote.subtotalCents,
            taxCents: quote.taxCents,
            totalCents: quote.totalCents,
            taxRateBps: quote.taxRateBps,
            taxLabel: quote.taxLabel,
            currency: quote.currency,
            checkoutKey,
            cartHash: hash,
            items: {
              create: quote.lines.map((l) => ({
                productId: l.productId,
                productName: l.name,
                imageUrl: l.imageUrl,
                unitCode: l.unit.code,
                unitLabel: l.unit.label,
                unitPriceCents: l.unitPriceCents,
                quantity: new Prisma.Decimal(l.quantity),
                lineSubtotalCents: l.lineSubtotalCents,
                taxable: l.taxable,
              })),
            },
          },
          include: { payments: true },
        });
        await audit(
          {
            actorId: user.id,
            actorRole: "CUSTOMER",
            ip,
            action: "CHECKOUT_STARTED",
            entityType: "Order",
            entityId: created.id,
            data: { totalCents: quote.totalCents, lines: quote.lines.length },
          },
          tx,
        );
        return created;
      });
    } catch (err) {
      // Two simultaneous requests with the same key: the loser re-reads the winner's order.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") order = await findExisting();
      else throw err;
    }
  }
  if (!order || order.userId !== user.id) {
    throw new HttpError(409, "Your checkout session expired. Please try again.", { code: "CHECKOUT_KEY_CONFLICT" });
  }
  if (order.status !== "AWAITING_PAYMENT") return { kind: "already_paid", orderId: order.id };
  if (order.cartHash !== hash) {
    throw new HttpError(409, "Your cart or prices changed. Please review your order again.", { code: "CART_CHANGED" });
  }

  const existing = order.payments.find((p) => p.provider === provider.name && p.status !== "CANCELLED");
  let clientSecret: string | null;
  if (existing) {
    ({ clientSecret } = await provider.resumePayment(existing.providerPaymentId));
    if (existing.status === "FAILED") {
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
    }
  } else {
    const created = await provider.createPayment({
      orderId: order.id,
      userId: user.id,
      amountCents: order.totalCents,
      currency: order.currency,
      description: `YYC Halal online order (${quote.lines.length} item${quote.lines.length === 1 ? "" : "s"})`,
    });
    await db.payment.upsert({
      where: { providerPaymentId: created.providerPaymentId },
      update: {},
      create: {
        orderId: order.id,
        provider: provider.name,
        providerPaymentId: created.providerPaymentId,
        amountCents: order.totalCents,
        currency: order.currency,
      },
    });
    clientSecret = created.clientSecret;
  }
  return { kind: "payment", orderId: order.id, provider: provider.name, clientSecret, quote };
}

/** Re-checks stock for a draft order right before the card is charged. */
export async function verifyOrderStock(orderId: string, userId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status !== "AWAITING_PAYMENT") return { ok: true as const, problems: [] };
  const quote = await quoteCart(order.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })));
  const priceChanged = cartHash(quote) !== order.cartHash;
  return { ok: quote.problems.length === 0 && !priceChanged, problems: quote.problems, priceChanged };
}

// ───────────────────────────── Payment results ─────────────────────────────

/**
 * Confirms an order after the processor reports a successful payment (webhook or server-side check).
 * Idempotent: safe to call any number of times for the same payment.
 */
export async function markOrderPaid(orderId: string, snap: PaymentSnapshot, providerName: string, source: string) {
  const settings = await getSettings();
  const result = await db.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return { kind: "missing" as const };
    if (order.status !== "AWAITING_PAYMENT") return { kind: "already" as const };

    if (snap.amountCents !== order.totalCents) {
      await audit(
        {
          ...auditBy(SYSTEM),
          action: "PAYMENT_AMOUNT_MISMATCH",
          entityType: "Order",
          entityId: orderId,
          data: { expected: order.totalCents, received: snap.amountCents, providerPaymentId: snap.providerPaymentId },
        },
        tx,
      );
      return { kind: "mismatch" as const };
    }

    // Take the items out of inventory. Anything that sold out mid-payment gets the order auto-cancelled + refunded.
    const soldOut: string[] = [];
    for (const item of order.items) {
      const taken = await tx.inventory.updateMany({
        where: { productId: item.productId, trackQuantity: true, quantityOnHand: { gte: item.quantity } },
        data: { quantityOnHand: { decrement: item.quantity } },
      });
      if (taken.count === 1) {
        await tx.orderItem.update({ where: { id: item.id }, data: { stockDeducted: true } });
      } else {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (!inv || inv.trackQuantity || inv.markedOutOfStock) soldOut.push(item.productName);
      }
    }

    const orderNumber = await nextOrderNumber(tx);
    const now = new Date();
    await tx.order.update({
      where: { id: orderId },
      data: { orderNumber, status: "IN_PROGRESS", paymentStatus: "PAID", paidAt: now },
    });
    const paymentData = {
      status: "PAID" as const,
      methodType: snap.methodType,
      cardBrand: snap.cardBrand,
      last4: snap.last4,
      failureMessage: null,
      paidAt: now,
    };
    await tx.payment.upsert({
      where: { providerPaymentId: snap.providerPaymentId },
      update: paymentData,
      create: {
        ...paymentData,
        orderId,
        provider: providerName,
        providerPaymentId: snap.providerPaymentId,
        amountCents: snap.amountCents,
        currency: order.currency,
      },
    });
    await audit(
      {
        ...auditBy(SYSTEM),
        action: "ORDER_PAID",
        entityType: "Order",
        entityId: orderId,
        data: { orderNumber, source, providerPaymentId: snap.providerPaymentId, amountCents: snap.amountCents },
      },
      tx,
    );

    if (soldOut.length) return { kind: "sold_out" as const, soldOut };

    const notification = await createNotification(tx, {
      userId: order.userId,
      orderId,
      type: "ORDER_RECEIVED",
      title: "Order received",
      body: `Payment successful. Your order #${orderNumber} is in progress.`,
    });
    if (settings.autoPrintReceipts) await tx.printJob.create({ data: { orderId, kind: "RECEIPT" } });
    return { kind: "paid" as const, orderNumber, notification };
  });

  if (result.kind === "sold_out") {
    await cancelOrder(
      orderId,
      SYSTEM,
      `Sorry — ${result.soldOut.join(", ")} sold out while your payment was processing. You have been fully refunded.`,
    );
  } else if (result.kind === "paid") {
    await Promise.all([sendReceiptEmail(orderId), pushNotification(result.notification)]);
  }
  return result;
}

export async function markPaymentFailed(orderId: string, snap: PaymentSnapshot, status: "FAILED" | "CANCELLED", source: string) {
  await db.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "AWAITING_PAYMENT") return;
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    await tx.payment.updateMany({
      where: { providerPaymentId: snap.providerPaymentId, status: { in: ["PENDING", "FAILED"] } },
      data: { status, failureMessage: snap.failureMessage },
    });
    await audit(
      {
        ...auditBy(SYSTEM),
        action: status === "FAILED" ? "PAYMENT_FAILED" : "PAYMENT_CANCELLED",
        entityType: "Order",
        entityId: orderId,
        data: { source, providerPaymentId: snap.providerPaymentId, message: snap.failureMessage },
      },
      tx,
    );
  });
}

/** Asks the processor for the truth about a payment and applies it. Used by webhooks and the confirmation page. */
export async function syncPayment(providerPaymentId: string, source: string) {
  const payment = await db.payment.findUnique({ where: { providerPaymentId } });
  if (!payment) return null;
  const snap = await providerFor(payment).getPayment(providerPaymentId);
  if (snap.outcome === "succeeded") await markOrderPaid(payment.orderId, snap, payment.provider, source);
  else if (snap.outcome === "failed") await markPaymentFailed(payment.orderId, snap, "FAILED", source);
  else if (snap.outcome === "canceled") await markPaymentFailed(payment.orderId, snap, "CANCELLED", source);
  return snap;
}

export async function sendReceiptEmail(orderId: string) {
  // Claim the send first so concurrent confirmations email only once.
  const claimed = await db.order.updateMany({ where: { id: orderId, receiptEmailAt: null }, data: { receiptEmailAt: new Date() } });
  if (claimed.count === 0) return;
  const receipt = await loadReceipt(orderId);
  if (!receipt) return;
  const ok = await sendMail(receiptEmail(receipt));
  if (!ok) await db.order.update({ where: { id: orderId }, data: { receiptEmailAt: null } });
  else await audit({ ...auditBy(SYSTEM), action: "RECEIPT_EMAILED", entityType: "Order", entityId: orderId, data: { to: receipt.customerEmail } });
}

// ───────────────────────────── Order status (store staff) ─────────────────────────────

const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  IN_PROGRESS: ["READY_FOR_PICKUP", "COMPLETED"],
  READY_FOR_PICKUP: ["COMPLETED", "IN_PROGRESS"],
};

export async function updateOrderStatus(orderId: string, to: OrderStatus, actor: Actor) {
  const settings = await getSettings();
  const result = await db.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || !order.orderNumber) throw new HttpError(404, "Order not found.");
    if (order.status === to) return { order, notification: null };
    if (!TRANSITIONS[order.status]?.includes(to)) {
      throw new HttpError(409, `Can't change an order from ${order.status} to ${to}.`);
    }
    const now = new Date();
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        readyAt: to === "READY_FOR_PICKUP" ? now : to === "IN_PROGRESS" ? null : undefined,
        completedAt: to === "COMPLETED" ? now : undefined,
      },
    });
    let notification = null;
    if (to === "READY_FOR_PICKUP") {
      notification = await createNotification(tx, {
        userId: order.userId,
        orderId,
        type: "ORDER_READY",
        title: "Ready for pickup",
        body: `Your YYC Halal order #${order.orderNumber} is ready for pickup.`,
      });
    } else if (to === "COMPLETED") {
      notification = await createNotification(tx, {
        userId: order.userId,
        orderId,
        type: "ORDER_COMPLETED",
        title: "Order completed",
        body: `Order #${order.orderNumber} is complete. Thank you for shopping at YYC Halal!`,
      });
    }
    await audit(
      { ...auditBy(actor), action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, data: { from: order.status, to } },
      tx,
    );
    return { order: updated, notification };
  });

  if (result.notification) await pushNotification(result.notification);
  if (to === "READY_FOR_PICKUP" && result.notification && settings.emailWhenReady) {
    const receipt = await loadReceipt(orderId);
    if (receipt) await sendMail(readyEmail(receipt));
  }
  return result.order;
}

// ───────────────────────────── Refunds & cancellation (store staff) ─────────────────────────────

export type RefundRequest =
  | { type: "FULL"; reason?: string }
  | { type: "PARTIAL"; amountCents: number; reason?: string }
  | { type: "ITEM"; items: { orderItemId: string; quantity: number }[]; reason?: string }
  | { type: "CANCELLATION"; reason?: string };

/** `lineCents` is the pre-tax part of the refund; `amountCents` includes tax. */
type RefundItemRecord = { orderItemId: string; productName: string; quantity: number; lineCents: number; amountCents: number };

function refundItems(json: Prisma.JsonValue | null): RefundItemRecord[] {
  return Array.isArray(json) ? (json as unknown as RefundItemRecord[]) : [];
}

/** Creates a refund with the processor. Amounts are computed and capped on the server. */
export async function createRefund(orderId: string, req: RefundRequest, actor: Actor) {
  const { refund, payment } = await db.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: { where: { status: { in: PAID_STATES } }, orderBy: { createdAt: "desc" } },
        refunds: { where: { status: "PENDING" } },
      },
    });
    if (!order || !order.orderNumber) throw new HttpError(404, "Order not found.");
    const payment = order.payments[0];
    if (!payment || !PAID_STATES.includes(order.paymentStatus)) throw new HttpError(409, "This order has nothing left to refund.");

    const pendingCents = order.refunds.reduce((s, r) => s + r.amountCents, 0);
    const remaining = order.totalCents - order.refundedCents - pendingCents;
    if (remaining <= 0) throw new HttpError(409, "This order has already been fully refunded (or a refund is still processing).");

    let amountCents = 0;
    const items: RefundItemRecord[] = [];
    if (req.type === "FULL" || req.type === "CANCELLATION") {
      amountCents = remaining;
    } else if (req.type === "PARTIAL") {
      if (!Number.isInteger(req.amountCents) || req.amountCents <= 0) throw new HttpError(400, "Enter a refund amount.");
      if (req.amountCents > remaining) throw new HttpError(400, `The most you can refund is ${formatMoney(remaining)}.`);
      amountCents = req.amountCents;
    } else {
      const pendingItems = order.refunds.flatMap((r) => refundItems(r.items));
      for (const reqItem of req.items) {
        const item = order.items.find((i) => i.id === reqItem.orderItemId);
        if (!item) throw new HttpError(400, "That item isn't part of this order.");
        const pending = pendingItems.filter((p) => p.orderItemId === item.id);
        const refundableMilli =
          toMilli(item.quantity.toString()) - toMilli(item.refundedQuantity.toString()) - pending.reduce((s, p) => s + toMilli(p.quantity), 0);
        const qtyMilli = toMilli(reqItem.quantity);
        if (qtyMilli <= 0 || qtyMilli > refundableMilli) {
          throw new HttpError(400, `You can refund at most ${fromMilli(refundableMilli)} ${item.unitLabel} of ${item.productName}.`);
        }
        // Refunding the whole remaining line uses the exact remaining cents, so rounding never drifts.
        const lineCents =
          qtyMilli === refundableMilli
            ? item.lineSubtotalCents - item.refundedCents - pending.reduce((s, p) => s + p.lineCents, 0)
            : lineTotalCents(item.unitPriceCents, qtyMilli);
        const withTax = lineCents + (item.taxable ? taxCents(lineCents, order.taxRateBps) : 0);
        items.push({ orderItemId: item.id, productName: item.productName, quantity: fromMilli(qtyMilli), lineCents, amountCents: withTax });
        amountCents += withTax;
      }
      amountCents = Math.min(amountCents, remaining);
      if (amountCents <= 0) throw new HttpError(400, "Choose at least one item to refund.");
    }

    const refund = await tx.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        type: req.type,
        amountCents,
        reason: req.reason?.trim() || null,
        items: items.length ? (items as unknown as Prisma.InputJsonValue) : undefined,
        createdById: actor.id,
      },
    });
    await audit(
      { ...auditBy(actor), action: "REFUND_REQUESTED", entityType: "Order", entityId: orderId, data: { refundId: refund.id, type: req.type, amountCents } },
      tx,
    );
    return { refund, payment };
  });

  let outcome;
  try {
    outcome = await providerFor(payment).refund({
      refundId: refund.id,
      providerPaymentId: payment.providerPaymentId,
      amountCents: refund.amountCents,
      idempotencyKey: `refund-${refund.id}`,
      reason: refund.reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    await markRefundFailed(refund.id, message);
    throw new HttpError(502, `The payment processor could not complete the refund: ${message}`);
  }
  await db.refund.update({ where: { id: refund.id }, data: { providerRefundId: outcome.providerRefundId } });
  if (outcome.outcome === "succeeded") await applyRefundSucceeded(refund.id);
  else if (outcome.outcome === "failed") await markRefundFailed(refund.id, "Declined by the payment processor");
  return db.refund.findUniqueOrThrow({ where: { id: refund.id } });
}

async function restock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, stockDeducted: true } });
  for (const item of items) {
    await tx.inventory.update({ where: { productId: item.productId }, data: { quantityOnHand: { increment: item.quantity } } });
    await tx.orderItem.update({ where: { id: item.id }, data: { stockDeducted: false } });
  }
}

/** Applies a refund the processor confirmed. Idempotent (webhook + API response may both call it). */
export async function applyRefundSucceeded(refundId: string, actor: Actor = SYSTEM) {
  const settings = await getSettings();
  const result = await db.$transaction(async (tx) => {
    const pre = await tx.refund.findUnique({ where: { id: refundId } });
    if (!pre) return null;
    await lockOrder(tx, pre.orderId);
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });
    if (refund.status === "SUCCEEDED") return null;

    const order = await tx.order.findUniqueOrThrow({ where: { id: refund.orderId } });
    const refundedCents = Math.min(order.totalCents, order.refundedCents + refund.amountCents);
    const fully = refundedCents >= order.totalCents;
    const paymentStatus: PaymentStatus = fully ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const cancelling = refund.type === "CANCELLATION";

    await tx.refund.update({ where: { id: refundId }, data: { status: "SUCCEEDED", succeededAt: new Date() } });
    for (const item of refundItems(refund.items)) {
      await tx.orderItem.update({
        where: { id: item.orderItemId },
        data: { refundedQuantity: { increment: item.quantity }, refundedCents: { increment: item.lineCents } },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedCents,
        paymentStatus,
        ...(cancelling ? { status: "CANCELLED" as const, cancelledAt: new Date() } : {}),
      },
    });
    await tx.payment.update({ where: { id: refund.paymentId }, data: { status: paymentStatus } });
    if (cancelling) await restock(tx, order.id);

    const amount = formatMoney(refund.amountCents, order.currency);
    const reason = refund.reason ? ` ${refund.reason}` : "";
    const notification = await createNotification(tx, {
      userId: order.userId,
      orderId: order.id,
      ...(cancelling
        ? { type: "ORDER_CANCELLED" as const, title: "Order cancelled", body: `Order #${order.orderNumber} was cancelled and ${amount} was refunded.${reason}` }
        : fully
          ? {
              type: "REFUND_FULL" as const,
              title: "Refund issued",
              body:
                order.refundedCents === 0
                  ? `A full refund of ${amount} for order #${order.orderNumber} has been issued.`
                  : `A refund of ${amount} for order #${order.orderNumber} has been issued. Your order is now fully refunded.`,
            }
          : { type: "REFUND_PARTIAL" as const, title: "Partial refund issued", body: `A refund of ${amount} for order #${order.orderNumber} has been issued.` }),
    });
    if (settings.autoPrintReceipts) await tx.printJob.create({ data: { orderId: order.id, kind: "REFUND" } });
    await audit(
      {
        ...auditBy(actor),
        action: "REFUND_SUCCEEDED",
        entityType: "Order",
        entityId: order.id,
        data: { refundId, providerRefundId: refund.providerRefundId, amountCents: refund.amountCents, paymentStatus },
      },
      tx,
    );
    return { notification, orderId: order.id };
  });
  if (!result) return;

  const receipt = await loadReceipt(result.orderId);
  const refundView = receipt?.refunds.find((r) => r.id === refundId);
  await Promise.all([
    receipt && refundView ? sendMail(refundEmail(receipt, refundView)) : null,
    pushNotification(result.notification),
  ]);
}

export async function markRefundFailed(refundId: string, message: string) {
  const refund = await db.refund.findUnique({ where: { id: refundId } });
  if (!refund || refund.status !== "PENDING") return;
  await db.refund.update({ where: { id: refundId }, data: { status: "FAILED" } });
  await audit({ ...auditBy(SYSTEM), action: "REFUND_FAILED", entityType: "Order", entityId: refund.orderId, data: { refundId, message } });
}

/** Records a refund made outside the app (e.g. in the Stripe dashboard) so the customer's order stays accurate. */
export async function recordExternalRefund(providerPaymentId: string, providerRefundId: string, amountCents: number) {
  const exists = await db.refund.findUnique({ where: { providerRefundId } });
  if (exists) return applyRefundSucceeded(exists.id);
  const payment = await db.payment.findUnique({ where: { providerPaymentId }, include: { order: true } });
  if (!payment?.order.orderNumber) return;
  const remaining = payment.order.totalCents - payment.order.refundedCents;
  if (amountCents <= 0 || remaining <= 0) return;
  const type: RefundType = amountCents >= remaining && payment.order.refundedCents === 0 ? "FULL" : "PARTIAL";
  const refund = await db.refund.create({
    data: {
      orderId: payment.orderId,
      paymentId: payment.id,
      providerRefundId,
      type,
      amountCents: Math.min(amountCents, remaining),
      reason: "Refunded by the store",
    },
  });
  await applyRefundSucceeded(refund.id, { id: null, role: "WEBHOOK" });
}

/** Cancels an order. Paid orders are refunded in full; stock goes back on the shelf. */
export async function cancelOrder(orderId: string, actor: Actor, reason?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: "desc" } }, refunds: { where: { status: "PENDING" } } },
  });
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status === "CANCELLED") return order;
  if (order.status === "COMPLETED") throw new HttpError(409, "Completed orders can't be cancelled. Issue a refund instead.");

  if (order.status === "AWAITING_PAYMENT") {
    // An unpaid draft: void the pending payment so it can never be charged later.
    for (const p of order.payments.filter((p) => p.status === "PENDING" || p.status === "FAILED")) {
      await providerFor(p).cancelPayment(p.providerPaymentId).catch((e) => console.error("[cancel] payment", e));
      await db.payment.update({ where: { id: p.id }, data: { status: "CANCELLED" } });
    }
    await db.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() } });
    await audit({ ...auditBy(actor), action: "DRAFT_CANCELLED", entityType: "Order", entityId: orderId, data: { reason: reason ?? null } });
    return db.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  const pendingCents = order.refunds.reduce((s, r) => s + r.amountCents, 0);
  if (order.totalCents - order.refundedCents - pendingCents > 0) {
    await createRefund(orderId, { type: "CANCELLATION", reason }, actor);
  } else {
    const notification = await db.$transaction(async (tx) => {
      await lockOrder(tx, orderId);
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await restock(tx, orderId);
      await audit({ ...auditBy(actor), action: "ORDER_CANCELLED", entityType: "Order", entityId: orderId, data: { reason: reason ?? null } }, tx);
      return createNotification(tx, {
        userId: order.userId,
        orderId,
        type: "ORDER_CANCELLED",
        title: "Order cancelled",
        body: `Order #${order.orderNumber} was cancelled.${reason ? ` ${reason}` : ""}`,
      });
    });
    await pushNotification(notification);
  }
  return db.order.findUniqueOrThrow({ where: { id: orderId } });
}
