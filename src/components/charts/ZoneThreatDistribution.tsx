"use client";

import { Card } from "@/components/ui/Card";
import { useRisk } from "@/lib/hooks";
import { riskZones, RISK_COLORS } from "@/lib/mock-data";
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

export default function ZoneThreatDistribution() {
  const { risk } = useRisk();
  const zones = risk?.zones ?? [];
  const data = riskZones.map((z) => {
    const dyn = zones.find((d) => d.zoneId === z.id);
    const score = (dyn?.dynamicScore ?? z.riskScore) * 100;
    const level = dyn?.riskLevel ?? z.riskLevel;
    return {
      id: z.id.toUpperCase(),
      name: z.name,
      score,
      color: RISK_COLORS[level],
    };
  });

  const peak = data.reduce((m, d) => (d.score > m.score ? d : m), data[0]);

  return (
    <Card variant="glass" className="p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="section-label text-[10px]">Zone Threat Distribution</div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {data.length} zones
        </div>
      </div>
      <div className="h-[100px] mt-3 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="id"
              tick={{ fontSize: 9, fill: "#6b6b6b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                background: "#131418",
                border: "1px solid #232529",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""}
              formatter={(v: number) => [`${v.toFixed(0)}%`, "Risk"]}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
        <span>Peak zone</span>
        <span className="text-[var(--color-fg-muted)] tabular">
          {peak?.name ?? "—"} · {peak ? peak.score.toFixed(0) + "%" : "—"}
        </span>
      </div>
    </Card>
  );
}
