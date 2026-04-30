"use client";

import { Card } from "@/components/ui/Card";
import { useRisk } from "@/lib/hooks";
import { useMemo } from "react";

interface Row {
  label: string;
  pct: number;
  tone: "muted" | "warning" | "critical";
}

function Bar({ row }: { row: Row }) {
  const colors = {
    muted: "from-[#3a3a3a] to-[#5a5a5a]",
    warning: "from-[#f4a949] to-[#ff6b1a]",
    critical: "from-[#ff6b1a] to-[#e63946]",
  } as const;
  const text = {
    muted: "text-[var(--color-fg-muted)]",
    warning: "text-[var(--color-warning)]",
    critical: "text-[var(--color-critical)]",
  } as const;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em]">
        <span className="text-[var(--color-fg-muted)] font-semibold">
          {row.label}
        </span>
        <span className={`${text[row.tone]} font-bold tabular`}>
          {row.pct.toFixed(0)}% Risk
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colors[row.tone]} transition-all duration-700`}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HistoricalVsPredicted() {
  const { risk } = useRisk();

  const rows: Row[] = useMemo(() => {
    const zones = risk?.zones ?? [];
    const baseAvg =
      (zones.length
        ? zones.reduce((s, z) => s + z.baseScore, 0) / zones.length
        : 0.22) * 100;
    const dynAvg =
      (zones.length
        ? zones.reduce((s, z) => s + z.dynamicScore, 0) / zones.length
        : 0.48) * 100;
    const projected = Math.min(98, dynAvg + 22);
    return [
      { label: "Historical Baseline (5yr)", pct: baseAvg, tone: "muted" },
      { label: "Current Seasonal Data", pct: dynAvg, tone: "warning" },
      { label: "Predicted Next 48H", pct: projected, tone: "critical" },
    ];
  }, [risk]);

  return (
    <Card variant="elevated" className="p-5">
      <div className="section-label">Historical vs Predicted</div>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <Bar key={r.label} row={r} />
        ))}
      </div>
    </Card>
  );
}
