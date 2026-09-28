"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-muted">Please try again. If it keeps happening, contact the store.</p>
      <button type="button" onClick={reset} className="btn-primary btn-lg">
        Try again
      </button>
    </main>
  );
}
