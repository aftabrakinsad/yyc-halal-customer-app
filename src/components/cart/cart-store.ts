"use client";

import type { UnitRules } from "@/lib/catalog";

// The cart lives in the browser (per signed-in customer) and only holds product ids,
// quantities and display info. Prices are always re-quoted by the server before checkout.

export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  unit: UnitRules;
};

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cacheKey = "";
let cacheLines: CartLine[] = EMPTY;

function storageKey(userId: string) {
  return `yyc-cart-v1:${userId}`;
}

function read(userId: string): CartLine[] {
  const key = storageKey(userId);
  if (key === cacheKey) return cacheLines;
  let lines: CartLine[] = EMPTY;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) lines = parsed.filter((l) => l && typeof l.productId === "string" && l.quantity > 0);
  } catch {}
  cacheKey = key;
  cacheLines = lines;
  return lines;
}

function write(userId: string, lines: CartLine[]) {
  cacheKey = storageKey(userId);
  cacheLines = lines;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("yyc-cart-v1:")) {
      cacheKey = ""; // another tab changed the cart
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const getServerSnapshot = () => EMPTY;

export function snapToUnit(quantity: number, unit: UnitRules): number {
  if (!Number.isFinite(quantity)) return unit.min;
  const step = unit.allowsDecimal ? unit.step : Math.max(1, unit.step);
  const snapped = Math.round(quantity / step) * step;
  return Math.min(unit.max, Math.max(unit.min, Number(snapped.toFixed(3))));
}

export function cartActions(userId: string) {
  const get = () => read(userId);
  return {
    get,
    add(line: CartLine) {
      const lines = get();
      const existing = lines.find((l) => l.productId === line.productId);
      const next = existing
        ? lines.map((l) => (l.productId === line.productId ? { ...line, quantity: snapToUnit(l.quantity + line.quantity, line.unit) } : l))
        : [...lines, { ...line, quantity: snapToUnit(line.quantity, line.unit) }];
      write(userId, next);
    },
    setQuantity(productId: string, quantity: number) {
      write(
        userId,
        get().map((l) => (l.productId === productId ? { ...l, quantity: snapToUnit(quantity, l.unit) } : l)),
      );
    },
    remove(productId: string) {
      write(userId, get().filter((l) => l.productId !== productId));
    },
    clear() {
      write(userId, EMPTY);
    },
  };
}
