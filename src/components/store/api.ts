"use client";

/** POST JSON to a store API and throw a readable error on failure. */
export async function storePost<T = unknown>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    // Full page load: drops all in-memory store state for a signed-out/disabled account.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/store/login");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? "Something went wrong.") as Error & { details?: unknown };
    err.details = data.details;
    throw err;
  }
  return data as T;
}
