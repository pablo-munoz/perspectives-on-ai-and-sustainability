"use client";

import { Card } from "@/components/ui/Card";
import { useFwi } from "@/lib/hooks";
import {
  classifyFWI,
  FWI_CLASS_LABEL,
  type FwiClass,
  type FwiDay,
} from "@/lib/fwi";

const CLASS_COLOR: Record<FwiClass, { bg: string; fg: string }> = {
  "very-low": { bg: "#ffffb2", fg: "#5a4a00" },
  low: { bg: "#fed976", fg: "#5a3d00" },
  moderate: { bg: "#feb24c", fg: "#3d2400" },
  high: { bg: "#fd8d3c", fg: "#1f0d00" },
  "very-high": { bg: "#f03b20", fg: "#ffffff" },
  extreme: { bg: "#bd0026", fg: "#ffffff" },
};

function dayLabel(iso: string, idx: number): string {
  if (idx === 0) return "Hoxe";
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    timeZone: "Europe/Madrid",
  });
}

export default function ForecastRibbon() {
  const { fwi, error, isLoading } = useFwi();

  if (error) {
    return (
      <Card variant="elevated" className="p-4">
        <div className="section-label">7-day FWI forecast</div>
        <div className="mt-2 text-[12px] text-[var(--color-fg-muted)]">
          Forecast unavailable.
        </div>
      </Card>
    );
  }

  const days: FwiDay[] = fwi?.forecast ?? [];

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex items-center justify-between">
        <div className="section-label">7-day FWI forecast</div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          {fwi ? "EFFIS-aligned · Open-Meteo" : "—"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {isLoading && days.length === 0
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-[78px] rounded-md bg-white/5 animate-pulse"
              />
            ))
          : days.slice(0, 7).map((d, i) => {
              const cls = classifyFWI(d.fwi);
              const c = CLASS_COLOR[cls];
              return (
                <div
                  key={d.date}
                  className="rounded-md p-2 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.03]"
                  style={{ background: c.bg, color: c.fg }}
                  title={`${d.date} · FWI ${d.fwi.toFixed(1)} · ${FWI_CLASS_LABEL[cls]}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
                    {dayLabel(d.date, i)}
                  </div>
                  <div className="text-lg font-display font-bold tabular leading-none">
                    {d.fwi.toFixed(0)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.1em] opacity-90 truncate max-w-full">
                    {FWI_CLASS_LABEL[cls]}
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}
