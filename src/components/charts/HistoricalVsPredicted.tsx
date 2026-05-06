"use client";

import { Card } from "@/components/ui/Card";
import { useForecast } from "@/lib/hooks";

interface Row {
  label: string;
  pct: number | null;
  tone: "muted" | "warning" | "critical";
  hint?: string;
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
  const display = row.pct == null ? "—" : `${row.pct.toFixed(0)}% Risk`;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em]">
        <span className="text-[var(--color-fg-muted)] font-semibold">
          {row.label}
        </span>
        <span className={`${text[row.tone]} font-bold tabular`}>{display}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colors[row.tone]} transition-all duration-700`}
          style={{ width: `${row.pct ?? 0}%` }}
        />
      </div>
      {row.hint && (
        <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          {row.hint}
        </div>
      )}
    </div>
  );
}

export default function HistoricalVsPredicted() {
  const { forecast } = useForecast();

  const rows: Row[] = [
    {
      label: "Historical Baseline (5yr)",
      pct: forecast ? forecast.fiveYearBaseline.value * 100 : null,
      tone: "muted",
      hint: forecast?.fiveYearBaseline.source,
    },
    {
      label: "Current Seasonal Data (30d)",
      pct: forecast?.currentSeasonal.value
        ? forecast.currentSeasonal.value * 100
        : null,
      tone: "warning",
      hint: forecast?.currentSeasonal.source,
    },
    {
      label: "Predicted Next 48H",
      pct: forecast?.predicted48h.value
        ? forecast.predicted48h.value * 100
        : null,
      tone: "critical",
      hint: forecast?.predicted48h.source,
    },
  ];

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
