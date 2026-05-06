"use client";

import { Card } from "@/components/ui/Card";
import { useHistory, type AggregateHistoryPoint } from "@/lib/hooks";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTs(ts: string): string {
  const d = new Date(ts);
  // Show day + hour for short windows, day for longer.
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return day;
}

export default function RiskTrendChart() {
  const { history } = useHistory<AggregateHistoryPoint>("7d");

  const data = useMemo(() => {
    const series = history?.series ?? [];
    return series.map((s) => ({
      date: formatTs(s.ts),
      predicted: s.avg * 100,
      peak: s.peak * 100,
    }));
  }, [history]);

  const empty = data.length === 0;

  return (
    <Card variant="glass" className="p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="section-label text-[10px]">7-Day Risk Trend</div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em]">
          <span className="flex items-center gap-1.5 text-[var(--color-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Avg
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-fg-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-fg-muted)]" />
            Peak
          </span>
        </div>
      </div>
      <div className="h-[100px] mt-3 -mx-2">
        {empty ? (
          <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Collecting history… ({history?.samples ?? 0} snapshots)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b1a" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ff6b1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#6b6b6b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "#131418",
                  border: "1px solid #232529",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#a8a8a8" }}
                formatter={(v: number) => [`${v.toFixed(0)}%`, ""]}
              />
              <Line
                type="monotone"
                dataKey="peak"
                stroke="#6b6b6b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#ff6b1a"
                strokeWidth={2}
                fill="url(#riskFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
