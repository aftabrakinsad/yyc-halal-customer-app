"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "../shell/Toaster";

type NewOrder = { id: string; orderNumber: string; customerName: string; totalCents: number };
type Ctx = {
  newIds: Set<string>;
  acknowledge: (id: string) => void;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  connected: boolean;
};
const StoreRealtimeContext = createContext<Ctx>({ newIds: new Set(), acknowledge: () => {}, soundOn: false, setSoundOn: () => {}, connected: false });

const SOUND_KEY = "yyc-store-sound";

/** Two-tone chime generated in the browser (no audio file needed). */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {}
}

/**
 * Live feed for the store: new paid orders pop up instantly (toast, NEW badge, optional chime,
 * tab-title counter) and every order change refreshes the screen — no manual reload.
 */
export function StoreRealtime({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [soundOn, setSoundState] = useState(false);
  const [connected, setConnected] = useState(false);
  const soundRef = useRef(false);

  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(SOUND_KEY) === "1";
    } catch {}
    soundRef.current = stored;
    queueMicrotask(() => setSoundState(stored));
  }, []);

  const setSoundOn = useCallback((on: boolean) => {
    soundRef.current = on;
    setSoundState(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    } catch {}
    if (on) chime();
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/store/events");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("new-order", (e) => {
      const orders = JSON.parse((e as MessageEvent).data) as NewOrder[];
      setNewIds((prev) => new Set([...prev, ...orders.map((o) => o.id)]));
      for (const o of orders) toast({ title: `New Order: #${o.orderNumber}`, body: o.customerName, href: `/store/orders/${o.id}`, tone: "info" });
      if (soundRef.current) chime();
      if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
        new Notification("New YYC Halal order", { body: orders.map((o) => `#${o.orderNumber}`).join(", "), icon: "/brand/icon-192.png" });
      }
      router.refresh();
    });
    source.addEventListener("change", () => router.refresh());
    source.addEventListener("signed-out", () => {
      source.close();
      // Full page load: drops all in-memory store state for a signed-out/disabled account.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/store/login");
    });
    return () => source.close();
  }, [router, toast]);

  // "(2) New orders" in the browser tab until they're looked at.
  useEffect(() => {
    const base = "YYC Halal Store";
    document.title = newIds.size ? `(${newIds.size}) New order${newIds.size > 1 ? "s" : ""} · ${base}` : base;
  }, [newIds]);

  const acknowledge = useCallback((id: string) => {
    setNewIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <StoreRealtimeContext.Provider value={{ newIds, acknowledge, soundOn, setSoundOn, connected }}>{children}</StoreRealtimeContext.Provider>
  );
}

export const useStoreRealtime = () => useContext(StoreRealtimeContext);
