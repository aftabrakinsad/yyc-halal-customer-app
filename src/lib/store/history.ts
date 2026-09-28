import "server-only";
import { db } from "../db";
import { formatMoney } from "../money";
import { ORDER_STATUS_LABEL } from "../labels";
import type { OrderStatus } from "@/generated/prisma/enums";

type Data = Record<string, unknown> | null;

function describe(action: string, data: Data): string {
  const amount = typeof data?.amountCents === "number" ? formatMoney(data.amountCents) : "";
  switch (action) {
    case "CHECKOUT_STARTED":
      return "Order created (customer confirmed checkout)";
    case "PAYMENT_FAILED":
      return `Payment attempt failed${data?.message ? `: ${data.message}` : ""}`;
    case "PAYMENT_CANCELLED":
      return "Payment cancelled";
    case "ORDER_PAID":
      return `Payment confirmed — order ${data?.orderNumber ?? ""} is In Progress`;
    case "RECEIPT_EMAILED":
      return `Receipt emailed to ${data?.to ?? "customer"}`;
    case "RECEIPT_REPRINTED":
      return "Receipt sent to POS printer";
    case "ORDER_STATUS_CHANGED":
      return `${ORDER_STATUS_LABEL[data?.from as OrderStatus] ?? data?.from} → ${ORDER_STATUS_LABEL[data?.to as OrderStatus] ?? data?.to}`;
    case "REFUND_STARTED":
    case "REFUND_REQUESTED":
      return `Refund started: ${amount}${data?.reasonCategory ? ` (${data.reasonCategory})` : ""}`;
    case "REFUND_COMPLETED":
    case "REFUND_SUCCEEDED":
      return `Refund completed: ${amount}`;
    case "REFUND_FAILED":
      return `Refund failed${data?.message ? `: ${data.message}` : ""}`;
    case "ORDER_CANCELLED":
      return `Order cancelled${amount ? ` and ${amount} refunded` : ""}`;
    case "PAYMENT_AMOUNT_MISMATCH":
      return "⚠ Payment amount didn't match the order — needs review";
    default:
      return action.replaceAll("_", " ").toLowerCase();
  }
}

/** Human-readable order timeline built from the permanent audit log. */
export async function orderHistory(orderId: string) {
  const logs = await db.auditLog.findMany({
    where: { entityType: "Order", entityId: orderId },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { name: true } } },
  });
  return logs.map((l) => ({
    id: l.id,
    at: l.createdAt.toISOString(),
    text: describe(l.action, (l.data as Data) ?? null),
    who: l.actor?.name ?? (l.actorRole === "CUSTOMER" ? "Customer" : "System"),
    action: l.action,
  }));
}
