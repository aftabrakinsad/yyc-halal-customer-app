"use client";

import { useState } from "react";
import type { UnitRules } from "@/lib/catalog";
import { snapToUnit } from "./cart/cart-store";
import { MinusIcon, PlusIcon } from "./icons";

/** Big −/+ buttons with a typeable value in the middle. Snaps to the unit's step (e.g. 0.5 lb). */
export function QuantityStepper({
  value,
  unit,
  onChange,
  label,
  disabled = false,
  size = "md",
}: {
  value: number;
  unit: UnitRules;
  onChange: (q: number) => void;
  label: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const step = unit.allowsDecimal ? unit.step : Math.max(1, unit.step);
  const h = size === "lg" ? "h-14" : "h-12";

  const commit = (raw: string) => {
    setDraft(null);
    const n = Number(raw.replace(",", "."));
    onChange(snapToUnit(Number.isFinite(n) && n > 0 ? n : unit.min, unit));
  };

  return (
    <div role="group" aria-label={label} className={`flex ${h} items-stretch overflow-hidden rounded-xl border-2 border-line bg-white`}>
      <button
        type="button"
        onClick={() => onChange(snapToUnit(value - step, unit))}
        disabled={disabled || value <= unit.min}
        aria-label={`Decrease ${label}`}
        className="flex w-12 items-center justify-center text-brand-700 hover:bg-brand-50 disabled:text-line"
      >
        <MinusIcon />
      </button>
      <label className="flex flex-1 items-center justify-center gap-1 border-x-2 border-line px-1">
        <span className="sr-only">{label}</span>
        <input
          type="text"
          inputMode={unit.allowsDecimal ? "decimal" : "numeric"}
          value={draft ?? String(value)}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-14 min-w-0 bg-transparent text-center text-lg font-bold outline-none"
        />
        <span className="text-sm font-semibold text-muted">{unit.label}</span>
      </label>
      <button
        type="button"
        onClick={() => onChange(snapToUnit(value + step, unit))}
        disabled={disabled || value >= unit.max}
        aria-label={`Increase ${label}`}
        className="flex w-12 items-center justify-center text-brand-700 hover:bg-brand-50 disabled:text-line"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
