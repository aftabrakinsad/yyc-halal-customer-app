// Money is always integer cents. Quantities are handled as integer thousandths ("milli")
// so 1.5 lb × $7.99 never goes through floating-point rounding.

export const TIME_ZONE = "America/Edmonton";

export function formatMoney(cents: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function toMilli(quantity: number | string): number {
  return Math.round(Number(quantity) * 1000);
}

export function fromMilli(milli: number): number {
  return milli / 1000;
}

/** Price × quantity, rounded half-up to the cent. */
export function lineTotalCents(unitPriceCents: number, quantityMilli: number): number {
  return Math.round((unitPriceCents * quantityMilli) / 1000);
}

/** Tax on an amount, rounded half-up to the cent. `rateBps` is basis points (500 = 5%). */
export function taxCents(amountCents: number, rateBps: number): number {
  return Math.round((amountCents * rateBps) / 10000);
}

export function formatRate(rateBps: number): string {
  return `${(rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 2)}%`;
}

export function formatQuantity(quantity: number | string, unitLabel: string): string {
  const n = Number(quantity);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} ${unitLabel}`;
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, dateStyle: "medium" }).format(new Date(date));
}
