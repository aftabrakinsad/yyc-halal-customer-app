"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { cartActions, getServerSnapshot, subscribe, type CartLine } from "./cart-store";

type CartContextValue = ReturnType<typeof cartActions> & { lines: CartLine[]; count: number; estimatedSubtotalCents: number };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const actions = useMemo(() => cartActions(userId), [userId]);
  const lines = useSyncExternalStore(subscribe, actions.get, getServerSnapshot);
  const value = useMemo(
    () => ({
      ...actions,
      lines,
      count: lines.length,
      estimatedSubtotalCents: lines.reduce((s, l) => s + Math.round(l.priceCents * l.quantity), 0),
    }),
    [actions, lines],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
