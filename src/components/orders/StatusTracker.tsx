import type { OrderStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/money";
import { CheckIcon } from "../icons";

type Timeline = { paidAt: string | null; readyAt: string | null; completedAt: string | null };

const STEPS = [
  { key: "PAID", label: "Payment received" },
  { key: "IN_PROGRESS", label: "In Progress", hint: "We're preparing your order." },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup", hint: "Come to the store and show your order number." },
  { key: "COMPLETED", label: "Completed" },
] as const;

const REACHED: Record<OrderStatus, number> = {
  AWAITING_PAYMENT: -1,
  IN_PROGRESS: 1,
  READY_FOR_PICKUP: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

/** ✓ done · ● current · ○ upcoming. Read-only: only store staff can change an order's status. */
export function StatusTracker({ status, timeline }: { status: OrderStatus; timeline: Timeline }) {
  const current = REACHED[status];
  const times: (string | null)[] = [timeline.paidAt, timeline.paidAt, timeline.readyAt, timeline.completedAt];

  return (
    <ol className="space-y-0" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && status === "COMPLETED") || i === 0;
        const active = i === current && status !== "COMPLETED";
        const last = i === STEPS.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={active ? "step" : undefined}>
            {!last && (
              <span aria-hidden className={`absolute top-10 left-[19px] h-[calc(100%-2.5rem)] w-0.5 ${i < current ? "bg-brand-600" : "bg-line"}`} />
            )}
            <span
              aria-hidden
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                done
                  ? "border-brand-600 bg-brand-600 text-white"
                  : active
                    ? step.key === "READY_FOR_PICKUP"
                      ? "border-gold-400 bg-gold-400 text-ink"
                      : "border-brand-600 bg-white text-brand-600"
                    : "border-line bg-white text-line"
              }`}
            >
              {done ? <CheckIcon width={22} height={22} /> : <span className={`h-3.5 w-3.5 rounded-full ${active ? "bg-current" : ""}`} />}
            </span>
            <div className="pt-1.5">
              <p className={`text-lg leading-tight font-bold ${done || active ? "text-ink" : "text-muted"}`}>
                {step.label}
                <span className="sr-only">{done ? " — done" : active ? " — current step" : " — upcoming"}</span>
              </p>
              {active && "hint" in step && <p className="text-muted">{step.hint}</p>}
              {(done || active) && times[i] && <p className="text-sm text-muted">{formatDateTime(times[i]!)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
