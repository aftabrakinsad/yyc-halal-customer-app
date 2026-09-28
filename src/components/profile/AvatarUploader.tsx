"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CameraIcon, UserIcon } from "../icons";

export function AvatarUploader({ imageUrl, name, hasCustomPhoto }: { imageUrl: string | null; name: string; hasCustomPhoto: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState(imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (method: "POST" | "DELETE", file?: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = file ? new FormData() : undefined;
      if (file) body!.append("file", file);
      const res = await fetch("/api/profile/avatar", { method, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setSrc(data.imageUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {src ? (
          <img src={src} alt={`${name}'s profile picture`} className="h-32 w-32 rounded-full object-cover ring-4 ring-brand-100" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-4 ring-brand-50">
            <UserIcon width={56} height={56} />
          </span>
        )}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="absolute right-0 bottom-0 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700"
          aria-label="Change profile picture"
        >
          <CameraIcon />
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) send("POST", file);
        }}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost min-h-11 text-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "Change photo"}
        </button>
        {hasCustomPhoto && (
          <button type="button" className="btn-ghost min-h-11 text-sm text-muted" onClick={() => send("DELETE")} disabled={busy}>
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
