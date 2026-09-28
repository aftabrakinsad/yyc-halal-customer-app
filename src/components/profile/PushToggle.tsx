"use client";

import { useSyncExternalStore, useState } from "react";
import { BellIcon } from "../icons";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToUint8(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const permission = () => ("Notification" in window ? Notification.permission : "unsupported");

/** Lets the customer turn on phone/desktop notifications (e.g. "Your order is ready for pickup"). */
export function PushToggle() {
  const initial = useSyncExternalStore(
    () => () => {},
    permission,
    () => "default",
  );
  const [state, setState] = useState<string | null>(null);
  const current = state ?? initial;

  const enable = async () => {
    const result = await Notification.requestPermission();
    setState(result);
    if (result !== "granted" || !VAPID || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID) }));
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  };

  if (current === "unsupported") {
    return <p className="text-sm text-muted">This browser doesn&apos;t support notifications. On iPhone, add YYC Halal to your Home Screen first.</p>;
  }
  if (current === "granted") {
    return (
      <p className="flex items-center gap-2 font-semibold text-brand-700">
        <BellIcon /> Notifications are on
      </p>
    );
  }
  if (current === "denied") {
    return <p className="text-sm text-muted">Notifications are blocked. You can turn them on in your browser settings.</p>;
  }
  return (
    <button type="button" onClick={enable} className="btn-secondary w-full">
      <BellIcon /> Turn on order notifications
    </button>
  );
}
