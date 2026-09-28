import "server-only";
import { formatDateTime, formatMoney, formatQuantity, formatRate } from "./money";
import { PAYMENT_STATUS_LABEL, REFUND_TYPE_LABEL } from "./labels";
import type { ReceiptData } from "./receipt";

const WIDTH = 42; // characters per line on a standard 80mm thermal printer

const center = (s: string) => " ".repeat(Math.max(0, Math.floor((WIDTH - s.length) / 2))) + s;
const pair = (l: string, r: string) => {
  const space = WIDTH - l.length - r.length;
  return space >= 1 ? l + " ".repeat(space) + r : `${l}\n${" ".repeat(Math.max(0, WIDTH - r.length))}${r}`;
};
const rule = "-".repeat(WIDTH);

/** Plain-text receipt for ESC/POS thermal printers (printed by the in-store print agent). */
export function posReceiptText(r: ReceiptData, kind: "RECEIPT" | "REFUND" = "RECEIPT"): string {
  const lines = [
    center(r.store.name.toUpperCase()),
    center(r.store.address),
    r.store.phone ? center(r.store.phone) : "",
    rule,
    center(kind === "REFUND" ? "*** REFUND ***" : "*** PICKUP ORDER ***"),
    center(`ORDER #${r.orderNumber}`),
    rule,
    formatDateTime(r.placedAt),
    `Customer: ${r.customerName}`,
    r.customerEmail,
    rule,
  ];
  for (const i of r.items) {
    lines.push(i.name.slice(0, WIDTH));
    lines.push(pair(`  ${formatQuantity(i.quantity, i.unitLabel)} @ ${formatMoney(i.unitPriceCents)}`, formatMoney(i.lineSubtotalCents)));
    if (i.refundedQuantity > 0) lines.push(pair(`  Refunded ${formatQuantity(i.refundedQuantity, i.unitLabel)}`, `-${formatMoney(i.refundedCents)}`));
  }
  lines.push(rule);
  lines.push(pair("Subtotal", formatMoney(r.subtotalCents)));
  lines.push(pair(`${r.taxLabel} ${formatRate(r.taxRateBps)}`, formatMoney(r.taxCents)));
  lines.push(pair("TOTAL PAID", formatMoney(r.totalCents)));
  for (const f of r.refunds) lines.push(pair(REFUND_TYPE_LABEL[f.type], `-${formatMoney(f.amountCents)}`));
  if (r.refundedCents > 0) lines.push(pair("UPDATED TOTAL", formatMoney(r.netPaidCents)));
  lines.push(rule);
  lines.push(`Payment: ${r.payment?.method ?? "-"}`);
  lines.push(`Status: ${PAYMENT_STATUS_LABEL[r.paymentStatus]}`);
  lines.push(rule, center(r.store.footer), "", "", "");
  // Thermal printers use a Latin-1 code page: swap characters they can't print.
  const text = lines.filter((l) => l !== "").join("\n") + "\n\n\n";
  return text.replace(/•/g, "*").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xff]/g, "?");
}
