"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useToast } from "./Toaster";

type RealtimeValue = { unread: number; setUnread: (n: number) => void };
const RealtimeContext = createContext<RealtimeValue>({ unread: 0, setUnread: () => {} });

/**
 * Listens to /api/events. When the store changes one of this customer's orders
 * (e.g. "Ready for Pickup"), the current page re-renders with fresh data and a
 * notification appears — no manual refresh needed.
 */
export function RealtimeProvider({ initialUnread, children }: { initialUnread: number; children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.addEventListener("hello", (e) => setUnread(JSON.parse((e as MessageEvent).data).unread));
    source.addEventListener("change", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as {
        unread: number;
        notification: { title: string; body: string; orderId: string | null } | null;
      };
      setUnread(data.unread);
      router.refresh();
      if (data.notification) {
        const href = data.notification.orderId ? `/orders/${data.notification.orderId}` : "/notifications";
        toast({ title: data.notification.title, body: data.notification.body, href, tone: "info" });
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          new Notification(data.notification.title, { body: data.notification.body, icon: "/brand/icon-192.png" });
        }
      }
    });
    return () => source.close();
  }, [router, toast]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return <RealtimeContext.Provider value={{ unread, setUnread }}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
