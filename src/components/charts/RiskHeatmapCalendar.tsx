"use client";

import { Card } from "@/components/ui/Card";
import { useHistory, type AggregateHistoryPoint } from "@/lib/hooks";
import { useMemo, useState } from "react";

const HEATMAP_COLORS = [
  "rgba(255,255,255,0.04)", // empty
  "#ffffb2",
  "#fed976",
  "#feb24c",
  "#fd8d3c",
  "#f03b20",
  "#bd0026",
];

const LABELS = ["Empty", "Very Low", "Low", "Moderate", "High", "Very High", "Extreme"];

function colorForScore(score: number | null): { color: string; label: string } {
  if (score == null || Number.isNaN(score))
    return { color: HEATMAP_COLORS[0], label: LABELS[0] };
  if (score >= 0.85) return { color: HEATMAP_COLORS[6], label: LABELS[6] };
  if (score >= 0.7) return { color: HEATMAP_COLORS[5], label: LABELS[5] };
  if (score >= 0.55) return { color: HEATMAP_COLORS[4], label: LABELS[4] };
  if (score >= 0.4) return { color: HEATMAP_COLORS[3], label: LABELS[3] };
  if (score >= 0.25) return { color: HEATMAP_COLORS[2], label: LABELS[2] };
  return { color: HEATMAP_COLORS[1], label: LABELS[1] };
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function RiskHeatmapCalendar() {
  const { history, error, isLoading } = useHistory<AggregateHistoryPoint>("90d");
  const [hovered, setHovered] = useState<string | null>(null);

  const dailyMax = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of history?.series ?? []) {
      const k = dateKey(p.ts);
      const cur = map.get(k);
      const v = (p as AggregateHistoryPoint).peak ?? 0;
      if (cur == null || v > cur) map.set(k, v);
    }
    return map;
  }, [history]);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const weeks: Array<Array<{ date: string; score: number | null }>> = [];
  // Render 13 weeks (≈ 90 days). Align Sunday columns.
  const totalDays = 91;
  const start = new Date(today.getTime() - (totalDays - 1) * 86400_000);
  const startDow = start.getUTCDay();
  let dayIndex = -startDow;
  for (let w = 0; w < 14; w++) {
    const week: Array<{ date: string; score: number | null }> = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getTime() + dayIndex * 86400_000);
      const key = dt.toISOString().slice(0, 10);
      if (dt < start || dt > today) {
        week.push({ date: key, score: null });
      } else {
        week.push({ date: key, score: dailyMax.get(key) ?? null });
      }
      dayIndex++;
    }
    weeks.push(week);
  }

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const first = week.find((d) => d.date);
      if (!first) return;
      const m = new Date(first.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        labels.push({
          col,
          label: new Date(first.date + "T00:00:00Z").toLocaleDateString(
            "es-ES",
            { month: "short", timeZone: "UTC" }
          ),
        });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex items-center justify-between">
        <div className="section-label">Daily peak risk · 90 days</div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          {hovered ?? "Hover a day"}
        </div>
      </div>

      {error ? (
        <div className="mt-3 text-[12px] text-[var(--color-fg-muted)]">
          History unavailable.
        </div>
      ) : isLoading && dailyMax.size === 0 ? (
        <div className="mt-3 h-[140px] flex items-center text-[12px] text-[var(--color-fg-muted)]">
          Loading 90-day archive…
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto custom-scrollbar">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, minmax(14px, 1fr))`,
              }}
            >
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => {
                    const { color, label } = colorForScore(day.score);
                    return (
                      <div
                        key={di}
                        className="h-[14px] w-full rounded-[2px]"
                        style={{ background: color }}
                        onMouseEnter={() =>
                          setHovered(
                            day.score == null
                              ? `${day.date} · no data`
                              : `${day.date} · ${(day.score * 100).toFixed(0)}% · ${label}`
                          )
                        }
                        onMouseLeave={() => setHovered(null)}
                        aria-label={`${day.date} ${label}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-1 flex text-[9px] text-[var(--color-fg-subtle)] uppercase tracking-[0.1em]">
              {monthLabels.map((m) => (
                <span
                  key={m.col}
                  style={{
                    marginLeft:
                      m.col === 0
                        ? 0
                        : `calc((100% / ${weeks.length}) * ${m.col - (monthLabels[monthLabels.indexOf(m) - 1]?.col ?? 0)})`,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            <span>Less</span>
            <div className="flex gap-1">
              {HEATMAP_COLORS.slice(1).map((c) => (
                <span
                  key={c}
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: c }}
                  aria-hidden
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </>
      )}
    </Card>
  );
}
