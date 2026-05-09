"use client";

import { Card } from "@/components/ui/Card";
import { useHistory, type ZoneHistoryPoint } from "@/lib/hooks";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import MetricInfo from "@/components/ui/MetricInfo";
import { Skeleton } from "@/components/ui/Skeleton";

const RANGES = ["7d", "30d", "90d"] as const;

export default function ZoneRiskHistory({ zoneId }: { zoneId: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("30d");
  const { history, isLoading } = useHistory<ZoneHistoryPoint>(range, zoneId);

  const data =
    history?.series.map((p) => ({
      ts: new Date(p.ts).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      }),
      score: p.score == null ? null : p.score * 100,
    })) ?? [];

  return (
    <Card variant="elevated" className="p-4 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="section-label inline-flex items-center gap-1">
          Risk score history
          <MetricInfo termId="risk-score" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.14em] ${
                range === r
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-[180px] -mx-2">
        {isLoading && data.length === 0 ? (
          <Skeleton className="h-full mx-2" />
        ) : data.length === 0 ? (
          <div className="h-full grid place-items-center text-[12px] text-[var(--color-fg-muted)]">
            No history yet for this zone.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 12, bottom: 0, left: -12 }}
            >
              <defs>
                <linearGradient id="zh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b1a" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#ff6b1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="ts"
                tick={{ fontSize: 10, fill: "#6b6b6b" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={36}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b6b6b" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                width={36}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                contentStyle={{
                  background: "#131418",
                  border: "1px solid #232529",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [`${v.toFixed(0)}%`, "Risk"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#ff6b1a"
                strokeWidth={1.6}
                fill="url(#zh)"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
