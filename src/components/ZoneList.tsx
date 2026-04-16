"use client";

import { riskZones, RISK_COLORS, RISK_LABELS, dailyRiskTrend, type RiskZone } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, MapPin } from "lucide-react";

interface ZoneListProps {
  onZoneSelect?: (zone: RiskZone) => void;
  selectedZoneId?: string | null;
}

function getTrend(zoneId: string) {
  const data = dailyRiskTrend;
  if (data.length < 2) return "stable";
  const prev = data[data.length - 2][zoneId] as number | undefined;
  const curr = data[data.length - 1][zoneId] as number | undefined;
  if (prev == null || curr == null) return "stable";
  if (curr - prev > 0.03) return "up";
  if (prev - curr > 0.03) return "down";
  return "stable";
}

export default function ZoneList({ onZoneSelect, selectedZoneId }: ZoneListProps) {
  const sorted = [...riskZones].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Monitored Zones ({riskZones.length})
      </h3>

      <div className="space-y-1 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
        {sorted.map((zone) => {
          const trend = getTrend(zone.id);
          const TrendIcon =
            trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
          const trendColor =
            trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-slate-500";

          return (
            <button
              key={zone.id}
              onClick={() => onZoneSelect?.(zone)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                "hover:bg-slate-700/50",
                selectedZoneId === zone.id && "bg-slate-700/70 ring-1 ring-slate-600"
              )}
            >
              <MapPin
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: RISK_COLORS[zone.riskLevel] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {zone.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {(zone.riskScore * 100).toFixed(0)}% risk
                </div>
              </div>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  backgroundColor: `${RISK_COLORS[zone.riskLevel]}20`,
                  color: RISK_COLORS[zone.riskLevel],
                }}
              >
                {RISK_LABELS[zone.riskLevel]}
              </span>
              <TrendIcon className={cn("w-3.5 h-3.5 flex-shrink-0", trendColor)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
