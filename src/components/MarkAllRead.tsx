"use client";

import { useEffect } from "react";
import { useRealtime } from "./shell/RealtimeProvider";

/** Opening the notifications page marks everything as read. */
export function MarkAllRead() {
  const { setUnread } = useRealtime();
  useEffect(() => {
    fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).then(
      (res) => res.ok && setUnread(0),
    );
  }, [setUnread]);
  return null;
}
