"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { CameraIcon } from "../icons";
import { storePost } from "./api";

export function ImageUpload({ value, onChange, label, aspect = "aspect-[4/3]" }: { value: string | null; onChange: (url: string | null) => void; label: string; aspect?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await storePost<{ url: string }>("/api/store/uploads", form);
      onChange(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-semibold">{label}</p>
      <div className={`relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-dashed border-line bg-cream ${aspect}`}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-muted">No image</span>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="flex gap-2">
        <button type="button" className="btn-secondary min-h-11 text-sm" onClick={() => input.current?.click()} disabled={busy}>
          <CameraIcon width={20} height={20} /> {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
        {value && (
          <button type="button" className="btn-ghost min-h-11 text-sm text-muted" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-semibold text-accent-500">
          {error}
        </p>
      )}
    </div>
  );
}
