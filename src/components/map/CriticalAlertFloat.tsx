"use client";

import { useAlerts } from "@/lib/hooks";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CriticalAlertFloat() {
  const { alerts } = useAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const top = alerts?.alerts?.find(
    (a) => a.severity === "critical" && !dismissed.has(a.id)
  );
  if (!top) return null;

  return (
    <div className="w-[300px] rounded-xl border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] backdrop-blur-md p-4 shadow-[0_24px_50px_-20px_rgba(255,107,26,0.5)]">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--color-accent)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Critical Alert
        </span>
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--color-fg)]">
        {top.title}. {top.description}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={() => setDismissed((s) => new Set(s).add(top.id))}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          Dismiss
        </button>
        <Link
          href="/alerts"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] hover:text-[var(--color-accent-hi)]"
        >
          View Zone
        </Link>
      </div>
    </div>
  );
}
