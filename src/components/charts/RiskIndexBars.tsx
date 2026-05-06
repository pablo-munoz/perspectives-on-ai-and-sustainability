"use client";

import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Toolbar";
import {
  useHistory,
  type AggregateHistoryPoint,
  type HistoryRange,
} from "@/lib/hooks";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function colorFor(v: number) {
  if (v >= 75) return "#e63946";
  if (v >= 55) return "#ff6b1a";
  if (v >= 30) return "#f4a949";
  return "#5fc77a";
}

function formatLabel(ts: string, range: HistoryRange): string {
  const d = new Date(ts);
  if (range === "7d")
    return d.toLocaleDateString("en-GB", { weekday: "short" });
  if (range === "30d")
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function RiskIndexBars() {
  const [range, setRange] = useState<HistoryRange>("7d");
  const { history } = useHistory<AggregateHistoryPoint>(range);

  const data = useMemo(() => {
    const series = history?.series ?? [];
    return series.map((s) => ({
      label: formatLabel(s.ts, range),
      v: Math.round(s.peak * 100), // peak score per bucket
    }));
  }, [history, range]);

  return (
    <Card variant="elevated" className="p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label">Risk Assessment</div>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Peak Fire Risk Index
          </h3>
        </div>
        <Segmented
          value={range}
          onChange={(v) => setRange(v)}
          options={[
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
          ]}
        />
      </div>

      <div className="mt-4 flex-1 min-h-[220px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Collecting history… ({history?.samples ?? 0} snapshots)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[...data]}
              margin={{ top: 10, right: 4, bottom: 0, left: -16 }}
            >
              <defs>
                {data.map((d, i) => (
                  <linearGradient
                    key={i}
                    id={`g-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={colorFor(d.v)}
                      stopOpacity={0.95}
                    />
                    <stop
                      offset="100%"
                      stopColor={colorFor(d.v)}
                      stopOpacity={0.55}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b6b6b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b6b6b" }}
                axisLine={false}
                tickLine={false}
                width={28}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  background: "#131418",
                  border: "1px solid #232529",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [`${v}% risk`, ""]}
              />
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#g-${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
