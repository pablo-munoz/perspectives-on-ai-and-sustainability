"use client";

import { useEffect, useState } from "react";
import { riskZones, RISK_COLORS, RISK_LABELS, type RiskLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

interface DynamicZone {
  zoneId: string;
  zoneName: string;
  baseScore: number;
  dynamicScore: number;
  riskLevel: RiskLevel;
  weatherModifier: number;
}

export default function RiskSummary() {
  const [dynamicZones, setDynamicZones] = useState<DynamicZone[] | null>(null);

  useEffect(() => {
    fetch("/api/risk")
      .then((res) => res.json())
      .then((data) => {
        if (data.zones) setDynamicZones(data.zones);
      })
      .catch(() => {});
  }, []);

  // Use dynamic scores if available, otherwise fall back to mock
  const zones = dynamicZones || riskZones.map((z) => ({
    zoneId: z.id,
    zoneName: z.name,
    baseScore: z.riskScore,
    dynamicScore: z.riskScore,
    riskLevel: z.riskLevel,
    weatherModifier: 0,
  }));

  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  zones.forEach((z) => counts[z.riskLevel]++);

  const maxZone = zones.reduce((max, z) => (z.dynamicScore > max.dynamicScore ? z : max), zones[0]);
  const overallLevel = maxZone.riskLevel;
  const isDynamic = dynamicZones !== null;

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Province Risk Level
        </h3>
        {isDynamic && (
          <span className="text-[9px] text-purple-400 flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            ML + Weather
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn("w-12 h-12 rounded-full shadow-lg")}
          style={{
            backgroundColor: RISK_COLORS[overallLevel],
            boxShadow: `0 0 20px ${RISK_COLORS[overallLevel]}60`,
          }}
        />
        <div>
          <div className="text-xl font-bold text-white">
            {RISK_LABELS[overallLevel]}
          </div>
          <div className="text-xs text-slate-400">
            Peak: {(maxZone.dynamicScore * 100).toFixed(0)}% — {maxZone.zoneName}
          </div>
          {isDynamic && maxZone.weatherModifier > 0 && (
            <div className="text-[10px] text-amber-400">
              +{(maxZone.weatherModifier * 100).toFixed(0)}% from weather
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["critical", "high", "medium", "low"] as RiskLevel[]).map((level) => (
          <div key={level} className="text-center">
            <div
              className="text-lg font-bold"
              style={{ color: RISK_COLORS[level] }}
            >
              {counts[level]}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              {RISK_LABELS[level]}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="text-[10px] text-slate-500">
          {zones.length} zones monitored
          {isDynamic && " — Scores adjusted by live weather"}
        </div>
      </div>
    </div>
  );
}
