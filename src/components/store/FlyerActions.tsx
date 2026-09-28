"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { storePost } from "./api";

export function FlyerActions({ id, title, active }: { id: string; title: string; active: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: message });
      router.refresh();
    } catch (e) {
      toast({ title: "Couldn't update flyer", body: (e as Error).message, tone: "info" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        className={active ? "btn-secondary min-h-11 text-sm" : "btn-primary min-h-11 text-sm"}
        onClick={() => run(() => storePost(`/api/store/flyers/${id}`, { active: !active }, "PATCH"), active ? "Flyer disabled" : "Flyer enabled")}
      >
        {active ? "Disable" : "Enable"}
      </button>
      <button
        type="button"
        disabled={busy}
        className="btn-danger min-h-11 text-sm"
        onClick={() => {
          if (confirm(`Remove the flyer “${title}”? This can't be undone.`)) run(() => storePost(`/api/store/flyers/${id}`, undefined, "DELETE"), "Flyer removed");
        }}
      >
        Remove
      </button>
    </div>
  );
}
