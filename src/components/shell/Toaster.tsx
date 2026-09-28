"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { BellIcon, CheckIcon } from "../icons";

type Toast = { id: number; title: string; body?: string; href?: string; tone: "success" | "info" };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-2), { tone: "success", ...t, id }]);
      setTimeout(() => dismiss(id), t.body ? 7000 : 2500);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const inner = (
            <>
              <span className={`mt-0.5 rounded-full p-1 ${t.tone === "success" ? "bg-brand-100 text-brand-700" : "bg-gold-400/30 text-ink"}`}>
                {t.tone === "success" ? <CheckIcon width={18} height={18} /> : <BellIcon width={18} height={18} />}
              </span>
              <span>
                <span className="block font-bold">{t.title}</span>
                {t.body && <span className="block text-sm text-muted">{t.body}</span>}
              </span>
            </>
          );
          const cls = "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-lg";
          return t.href ? (
            <Link key={t.id} href={t.href} className={cls} onClick={() => dismiss(t.id)}>
              {inner}
            </Link>
          ) : (
            <div key={t.id} className={cls} role="status">
              {inner}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
