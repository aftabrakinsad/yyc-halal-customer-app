"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@/generated/prisma/enums";
import { useToast } from "../shell/Toaster";
import { CheckIcon } from "../icons";
import { storePost } from "./api";

/** The two big preparation buttons. Transitions are enforced on the server. */
export function StatusButtons({ orderId, orderNumber, status, compact = false }: { orderId: string; orderNumber: string; status: OrderStatus; compact?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (next: OrderStatus, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await storePost(`/api/store/orders/${orderId}/status`, { status: next });
      toast({ title: message });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const big = compact ? "btn-lg" : "min-h-16 text-xl";
  return (
    <div className="space-y-2">
      {status === "IN_PROGRESS" && (
        <button type="button" disabled={busy} onClick={() => go("READY_FOR_PICKUP", `#${orderNumber} is ready — customer notified`)} className={`btn-primary w-full ${big}`}>
          {busy ? "Updating…" : "Ready for Pickup"}
        </button>
      )}
      {status === "READY_FOR_PICKUP" && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => go("COMPLETED", `#${orderNumber} picked up`)}
            className={`btn w-full bg-ink text-white hover:bg-black ${big}`}
          >
            <CheckIcon /> {busy ? "Updating…" : "Picked Up / Complete"}
          </button>
          <button type="button" disabled={busy} onClick={() => go("IN_PROGRESS", `#${orderNumber} moved back to In Progress`)} className="btn-ghost min-h-10 w-full text-sm">
            Undo: back to In Progress
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="font-semibold text-accent-500">
          {error}
        </p>
      )}
    </div>
  );
}
