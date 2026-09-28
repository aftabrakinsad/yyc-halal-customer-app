"use client";

// One idempotency key per checkout attempt, kept for the browser tab. Refreshing the
// payment page or tapping "Confirm" twice reuses it, so the server never creates a
// second order or a second charge.
const KEY = "yyc-checkout-key";

export function getCheckoutKey(): string {
  let key = sessionStorage.getItem(KEY);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(KEY, key);
  }
  return key;
}

export function resetCheckoutKey() {
  sessionStorage.removeItem(KEY);
}
