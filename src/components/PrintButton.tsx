"use client";

import { PrinterIcon } from "./icons";

export function PrintButton({ label = "Print or save as PDF", className = "btn-primary" }: { label?: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <PrinterIcon /> {label}
    </button>
  );
}
