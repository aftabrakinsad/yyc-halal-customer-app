"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { ImageUpload } from "./ImageUpload";
import { storePost } from "./api";

export type FlyerValue = {
  id?: string;
  kind: "FLYER" | "SALE" | "PROMOTION" | "SPECIAL_OFFER" | "ANNOUNCEMENT";
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

const KINDS: [FlyerValue["kind"], string][] = [
  ["FLYER", "Flyer"],
  ["SALE", "Sale"],
  ["PROMOTION", "Promotion"],
  ["SPECIAL_OFFER", "Special offer"],
  ["ANNOUNCEMENT", "Store announcement"],
];

// <input type="datetime-local"> works in the browser's local time (the store's computers are in Calgary).
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function FlyerForm({ initial }: { initial: FlyerValue }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [starts, setStarts] = useState(toLocalInput(initial.startsAt));
  const [ends, setEnds] = useState(toLocalInput(initial.endsAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FlyerValue>(k: K, val: FlyerValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (starts && ends && new Date(starts) >= new Date(ends)) return setError("The end date must be after the start date.");
    setBusy(true);
    try {
      const body = {
        kind: v.kind,
        title: v.title,
        subtitle: v.subtitle || null,
        body: v.body || null,
        imageUrl: v.imageUrl,
        linkUrl: v.linkUrl || null,
        active: v.active,
        startsAt: fromLocalInput(starts),
        endsAt: fromLocalInput(ends),
        sortOrder: v.sortOrder,
      };
      if (v.id) await storePost(`/api/store/flyers/${v.id}`, body, "PATCH");
      else await storePost("/api/store/flyers", body);
      toast({ title: v.id ? "Flyer saved" : "Flyer added" });
      router.push("/store/flyers");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-4 p-5">
        <label className="block font-semibold">
          Type
          <select value={v.kind} onChange={(e) => set("kind", e.target.value as FlyerValue["kind"])} className="input mt-1">
            {KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-semibold">
          Title
          <input required value={v.title} onChange={(e) => set("title", e.target.value)} className="input mt-1" maxLength={120} placeholder="Weekend BBQ Specials" />
        </label>
        <label className="block font-semibold">
          Subtitle
          <input value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="input mt-1" maxLength={200} />
        </label>
        <label className="block font-semibold">
          Details
          <textarea value={v.body} onChange={(e) => set("body", e.target.value)} className="input mt-1 min-h-28 py-3" maxLength={1000} />
        </label>
        <label className="block font-semibold">
          Link when tapped (optional)
          <input value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} className="input mt-1" placeholder="/order" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            Start showing
            <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className="input mt-1" />
            <span className="text-sm font-normal text-muted">Leave empty to start now</span>
          </label>
          <label className="block font-semibold">
            Stop showing
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className="input mt-1" />
            <span className="text-sm font-normal text-muted">Leave empty to keep showing</span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="h-6 w-6 accent-brand-600" />
            Enabled
          </label>
          <label className="flex items-center gap-2 font-semibold">
            Display order
            <input type="number" value={v.sortOrder} onChange={(e) => set("sortOrder", Math.trunc(Number(e.target.value)))} className="input w-24" />
          </label>
        </div>
      </div>
      <div className="space-y-5">
        <div className="card p-5">
          <ImageUpload label="Flyer image (optional)" value={v.imageUrl} onChange={(url) => set("imageUrl", url)} aspect="aspect-[16/9]" />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
            {error}
          </p>
        )}
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? "Saving…" : v.id ? "Save flyer" : "Add flyer"}
        </button>
      </div>
    </form>
  );
}
