"use client";

import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Toolbar";
import { useState } from "react";
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

const SERIES = {
  "7D": [
    { label: "Mon", v: 38 },
    { label: "Tue", v: 52 },
    { label: "Wed", v: 64 },
    { label: "Thu", v: 92 },
    { label: "Fri", v: 78 },
    { label: "Sat", v: 56 },
    { label: "Sun", v: 44 },
  ],
  "30D": Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    v: 30 + Math.round(Math.sin(i / 3) * 18 + Math.random() * 28),
  })),
  "90D": Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    v: 30 + Math.round(Math.sin(i / 2) * 22 + Math.random() * 22),
  })),
} as const;

type Range = keyof typeof SERIES;

function colorFor(v: number) {
  if (v >= 80) return "#e63946";
  if (v >= 60) return "#ff6b1a";
  if (v >= 40) return "#f4a949";
  return "#5fc77a";
}

export default function RiskIndexBars() {
  const [range, setRange] = useState<Range>("7D");
  const data = SERIES[range];

  return (
    <Card variant="elevated" className="p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label">Risk Assessment</div>
          <h3 className="mt-1 font-display text-xl font-semibold">
            7-Day Fire Risk Index
          </h3>
        </div>
        <Segmented
          value={range}
          onChange={(v) => setRange(v)}
          options={[
            { value: "7D", label: "7D" },
            { value: "30D", label: "30D" },
            { value: "90D", label: "90D" },
          ]}
        />
      </div>

      <div className="mt-4 flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 10, right: 4, bottom: 0, left: -16 }}>
            <defs>
              {data.map((d, i) => (
                <linearGradient key={i} id={`g-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorFor(d.v)} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={colorFor(d.v)} stopOpacity={0.55} />
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
      </div>
    </Card>
  );
}
