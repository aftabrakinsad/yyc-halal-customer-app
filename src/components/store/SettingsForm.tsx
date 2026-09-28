"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { storePost } from "./api";

export type SettingsValue = {
  storeName: string;
  addressLine: string;
  phone: string;
  email: string;
  taxRateBps: number;
  taxLabel: string;
  pickupInstructions: string;
  receiptFooter: string;
  autoPrintReceipts: boolean;
  emailWhenReady: boolean;
  acceptingOrders: boolean;
};

export function SettingsForm({ initial }: { initial: SettingsValue }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [rate, setRate] = useState((initial.taxRateBps / 100).toString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SettingsValue>(k: K, val: SettingsValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const taxRateBps = Math.round(Number(rate) * 100);
    if (!Number.isFinite(taxRateBps) || taxRateBps < 0 || taxRateBps > 3000) return setError("Enter a tax rate between 0 and 30%.");
    setBusy(true);
    setError(null);
    try {
      await storePost("/api/store/settings", { ...v, taxRateBps }, "PATCH");
      toast({ title: "Settings saved" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const text = (k: "storeName" | "addressLine" | "phone" | "email" | "taxLabel", label: string) => (
    <label className="block font-semibold">
      {label}
      <input value={v[k]} onChange={(e) => set(k, e.target.value)} className="input mt-1" />
    </label>
  );
  const toggle = (k: "autoPrintReceipts" | "emailWhenReady" | "acceptingOrders", label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={v[k]} onChange={(e) => set(k, e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-brand-600" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-2">
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-lg font-bold">Store information (receipts &amp; emails)</legend>
        {text("storeName", "Store name")}
        {text("addressLine", "Address")}
        {text("phone", "Phone")}
        {text("email", "Email")}
        <label className="block font-semibold">
          Pickup instructions
          <textarea value={v.pickupInstructions} onChange={(e) => set("pickupInstructions", e.target.value)} className="input mt-1 min-h-20 py-3" />
        </label>
        <label className="block font-semibold">
          Receipt footer
          <input value={v.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} className="input mt-1" />
        </label>
      </fieldset>
      <div className="space-y-5">
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-lg font-bold">Tax</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-semibold">
              Tax rate (%)
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="input mt-1" />
            </label>
            {text("taxLabel", "Tax name")}
          </div>
          <p className="text-sm text-muted">Applies to new checkouts immediately. Existing orders keep the rate they were charged.</p>
        </fieldset>
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-lg font-bold">Orders</legend>
          {toggle("acceptingOrders", "Accept online orders", "Turn off to pause checkout in the customer app (e.g. closing early).")}
          {toggle("autoPrintReceipts", "Print receipts automatically", "Every new paid order (and refund) is sent to the POS receipt printer.")}
          {toggle("emailWhenReady", "Email customers when orders are ready", "In addition to the in-app/push notification.")}
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
            {error}
          </p>
        )}
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
