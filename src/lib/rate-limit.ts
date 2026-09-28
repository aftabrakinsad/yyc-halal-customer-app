import "server-only";
import { HttpError } from "./http";

// Simple fixed-window limiter (per server instance). Put a shared store such as Redis
// behind this if the app runs on several servers.
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    return;
  }
  w.count++;
  if (w.count > limit) throw new HttpError(429, "Too many requests. Please wait a moment and try again.");
}
