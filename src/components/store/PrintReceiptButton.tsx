"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { PrinterIcon } from "../icons";
import { storePost } from "./api";

/** Reprint on the POS receipt printer, or open a printable copy in this browser. */
export function PrintReceiptButton({ orderId, orderNumber, withBrowserLink = true }: { orderId: string; orderNumber: string; withBrowserLink?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    try {
      await storePost(`/api/store/orders/${orderId}/print`);
      toast({ title: `Receipt #${orderNumber} sent to the POS printer` });
    } catch (e) {
      toast({ title: "Couldn't print", body: (e as Error).message, tone: "info" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" onClick={print} disabled={busy} className="btn-secondary min-h-11 px-4 text-sm">
        <PrinterIcon width={20} height={20} /> {busy ? "Sending…" : "Print Receipt"}
      </button>
      {withBrowserLink && (
        <Link href={`/store/orders/${orderId}/receipt`} className="text-sm font-semibold text-brand-700 underline">
          Print from this computer
        </Link>
      )}
    </div>
  );
}
