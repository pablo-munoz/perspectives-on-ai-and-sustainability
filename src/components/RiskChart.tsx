"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { dailyRiskTrend, riskZones, RISK_COLORS, type RiskLevel } from "@/lib/mock-data";

export default function RiskChart() {
  const distributionData: { level: string; count: number; color: string }[] = [
    { level: "Critical", count: riskZones.filter((z) => z.riskLevel === "critical").length, color: RISK_COLORS.critical },
    { level: "High", count: riskZones.filter((z) => z.riskLevel === "high").length, color: RISK_COLORS.high },
    { level: "Medium", count: riskZones.filter((z) => z.riskLevel === "medium").length, color: RISK_COLORS.medium },
    { level: "Low", count: riskZones.filter((z) => z.riskLevel === "low").length, color: RISK_COLORS.low },
  ];

  return (
    <div className="flex gap-4 h-full">
      {/* 7-day risk trend */}
      <div className="flex-1 rounded-xl bg-slate-800/60 border border-slate-700 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          7-Day Risk Trend
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={dailyRiskTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
              formatter={(value: number) => [`${(value * 100).toFixed(0)}%`, ""]}
            />
            <Line
              type="monotone"
              dataKey="z4"
              stroke={RISK_COLORS.critical}
              strokeWidth={2}
              dot={false}
              name="Macizo Central"
            />
            <Line
              type="monotone"
              dataKey="z1"
              stroke={RISK_COLORS.high}
              strokeWidth={2}
              dot={false}
              name="Serra de San Mamede"
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Province Avg"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk distribution */}
      <div className="w-56 rounded-xl bg-slate-800/60 border border-slate-700 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Zone Distribution
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={distributionData}>
            <XAxis
              dataKey="level"
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distributionData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
