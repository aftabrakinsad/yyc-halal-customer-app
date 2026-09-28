import "server-only";
import { formatDateTime, formatMoney, formatQuantity, formatRate } from "../money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, REFUND_TYPE_LABEL } from "../labels";
import type { ReceiptData } from "../receipt";
import type { Mail } from "../email";

const BRAND = "#0b6b3a";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function appUrl(path: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}

function layout(title: string, inner: string, store: ReceiptData["store"]) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f2;font-family:Arial,Helvetica,sans-serif;color:#1c1f1d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px;text-align:center">
<img src="${appUrl("/brand/logo-email.png")}" width="72" height="72" alt="YYC Halal" style="display:block;margin:0 auto 8px;border-radius:50%;background:#fff">
<div style="color:#fff;font-size:20px;font-weight:bold">${esc(store.name)}</div></td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${inner}
</td></tr>
<tr><td style="padding:16px 24px;background:#fafaf7;color:#5c635e;font-size:12px;text-align:center">
${esc(store.name)} · ${esc(store.address)}${store.phone ? ` · ${esc(store.phone)}` : ""}<br>${esc(store.footer)}
</td></tr></table></td></tr></table></body></html>`;
}

function row(label: string, value: string, bold = false) {
  return `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px" : ""}">${label}</td><td align="right" style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px" : ""}">${value}</td></tr>`;
}

function totalsTable(r: ReceiptData) {
  const cur = r.currency;
  let html = `<table role="presentation" width="100%" style="border-top:1px solid #e3e5e0;margin-top:12px;padding-top:8px">`;
  html += row("Subtotal", formatMoney(r.subtotalCents, cur));
  html += row(`${esc(r.taxLabel)} (${formatRate(r.taxRateBps)})`, formatMoney(r.taxCents, cur));
  html += row("Total paid", formatMoney(r.totalCents, cur), true);
  if (r.refundedCents > 0) {
    html += row("Refunded", `-${formatMoney(r.refundedCents, cur)}`);
    html += row("Updated total", formatMoney(r.netPaidCents, cur), true);
  }
  return html + `</table>`;
}

function itemsTable(r: ReceiptData) {
  const rows = r.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f1ee">
<div style="font-weight:bold">${esc(i.name)}</div>
<div style="color:#5c635e;font-size:13px">${formatQuantity(i.quantity, i.unitLabel)} × ${formatMoney(i.unitPriceCents, r.currency)} / ${esc(i.unitLabel)}${
        i.refundedQuantity > 0 ? ` · refunded ${formatQuantity(i.refundedQuantity, i.unitLabel)}` : ""
      }</div></td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #f0f1ee;vertical-align:top">${formatMoney(i.lineSubtotalCents, r.currency)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%">${rows}</table>`;
}

export function receiptEmail(r: ReceiptData): Mail {
  const meta = `<table role="presentation" width="100%" style="font-size:14px;margin-bottom:12px">
${row("Order number", `<strong>${esc(r.orderNumber)}</strong>`)}
${row("Date", formatDateTime(r.placedAt))}
${row("Customer", esc(r.customerName))}
${row("Email", esc(r.customerEmail))}
${row("Payment", esc(r.payment?.method ?? "—"))}
${row("Payment status", PAYMENT_STATUS_LABEL[r.paymentStatus])}
</table>`;
  const cta = `<p style="margin:24px 0 0;text-align:center"><a href="${appUrl(`/orders/${r.orderId}`)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold">Track your order</a></p>`;
  const html = layout(
    "Thank you! Your order is in progress.",
    `<p style="margin:0 0 16px">We've received your payment and started preparing your order. We'll let you know when it's ready for pickup.</p>${meta}${itemsTable(r)}${totalsTable(r)}${cta}`,
    r.store,
  );
  const text = [
    `${r.store.name} — Receipt`,
    `Order number: ${r.orderNumber}`,
    `Date: ${formatDateTime(r.placedAt)}`,
    `Customer: ${r.customerName} <${r.customerEmail}>`,
    "",
    ...r.items.map((i) => `${i.name} — ${formatQuantity(i.quantity, i.unitLabel)} × ${formatMoney(i.unitPriceCents)} = ${formatMoney(i.lineSubtotalCents)}`),
    "",
    `Subtotal: ${formatMoney(r.subtotalCents)}`,
    `${r.taxLabel} (${formatRate(r.taxRateBps)}): ${formatMoney(r.taxCents)}`,
    `Total paid: ${formatMoney(r.totalCents)}`,
    `Payment: ${r.payment?.method ?? "—"} (${PAYMENT_STATUS_LABEL[r.paymentStatus]})`,
    "",
    `Track your order: ${appUrl(`/orders/${r.orderId}`)}`,
  ].join("\n");
  return { to: r.customerEmail, subject: `Your YYC Halal receipt — Order #${r.orderNumber}`, html, text };
}

export function readyEmail(r: ReceiptData): Mail {
  const message = `Your YYC Halal order #${r.orderNumber} is ready for pickup.`;
  const html = layout(
    "Your order is ready for pickup!",
    `<p style="font-size:16px">${esc(message)}</p><p>${esc(r.store.pickupInstructions)}</p>
<p style="margin:24px 0 0;text-align:center"><a href="${appUrl(`/orders/${r.orderId}`)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold">View order</a></p>`,
    r.store,
  );
  return { to: r.customerEmail, subject: message, html, text: `${message}\n${r.store.pickupInstructions}\n${appUrl(`/orders/${r.orderId}`)}` };
}

export function refundEmail(r: ReceiptData, refund: ReceiptData["refunds"][number]): Mail {
  const label = REFUND_TYPE_LABEL[refund.type];
  const itemsList = refund.items.length
    ? `<ul>${refund.items.map((i) => `<li>${esc(i.productName)} — ${i.quantity} (${formatMoney(i.amountCents, r.currency)})</li>`).join("")}</ul>`
    : "";
  const html = layout(
    refund.type === "CANCELLATION" ? `Order #${r.orderNumber} was cancelled` : `Refund issued for order #${r.orderNumber}`,
    `<p>A refund of <strong>${formatMoney(refund.amountCents, r.currency)}</strong> was issued to your ${esc(r.payment?.method ?? "original payment method")}.
It can take 5–10 business days to appear on your statement.</p>
${refund.reason ? `<p><strong>Reason:</strong> ${esc(refund.reason)}</p>` : ""}${itemsList}
<table role="presentation" width="100%" style="font-size:14px">
${row("Type", label)}
${row("Refund transaction", esc(refund.transactionId ?? "—"))}
${row("Order status", ORDER_STATUS_LABEL[r.status])}
</table>${totalsTable(r)}`,
    r.store,
  );
  const text = `${label}: ${formatMoney(refund.amountCents)} for order #${r.orderNumber}.\nOriginal total: ${formatMoney(r.totalCents)}\nRefunded: -${formatMoney(r.refundedCents)}\nUpdated total: ${formatMoney(r.netPaidCents)}`;
  return { to: r.customerEmail, subject: `${label} — YYC Halal order #${r.orderNumber}`, html, text };
}
