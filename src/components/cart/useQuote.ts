"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/pricing";
import type { CartLine } from "./cart-store";

export async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string; details?: unknown } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) {
    // Session expired: a full page load to /login also clears any in-memory checkout state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  const data = await res.json().catch(() => ({ error: "Unexpected response from the server." }));
  return { ok: res.ok, status: res.status, data };
}

/** Asks the server for authoritative prices, tax and totals whenever the cart changes. */
export function useQuote(lines: CartLine[], refreshToken = 0) {
  const key = JSON.stringify(lines.map((l) => [l.productId, l.quantity]));
  const [state, setState] = useState<{ key: string; token: number; quote?: Quote; error?: string }>({ key: "", token: -1 });

  useEffect(() => {
    const items = (JSON.parse(key) as [string, number][]).map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { ok, data } = await postJson<Quote>("/api/cart/quote", { items });
        if (cancelled) return;
        if (!ok) throw new Error(data.error ?? "Couldn't load prices.");
        setState({ key, token: refreshToken, quote: data });
      } catch (e) {
        if (!cancelled) setState((s) => ({ key, token: refreshToken, quote: s.quote, error: e instanceof Error ? e.message : "Network error" }));
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, refreshToken]);

  const fresh = state.key === key && state.token === refreshToken;
  return {
    quote: state.quote ?? null, // may be one step behind while `loading`
    error: fresh ? (state.error ?? null) : null,
    loading: lines.length > 0 && !fresh,
  };
}
