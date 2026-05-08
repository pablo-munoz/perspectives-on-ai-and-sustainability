"use client";

import { Card } from "@/components/ui/Card";
import { useRisk, useWeather, useFwi } from "@/lib/hooks";
import { nelsonFMC } from "@/lib/fmc";
import { FWI_CLASS_LABEL, type FwiClass } from "@/lib/fwi";
import { useMemo } from "react";

interface BarRowProps {
  label: string;
  value: string;
  pct: number;
  tone: "low" | "high";
  hint?: string;
}

function BarRow({ label, value, pct, tone, hint }: BarRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] tracking-wide">
        <span className="text-[var(--color-fg-muted)] font-medium">
          {label}
        </span>
        <span
          className={
            tone === "high"
              ? "text-[var(--color-critical)] font-semibold tabular"
              : "text-[var(--color-success)] font-semibold tabular"
          }
        >
          {value} {hint && <span className="text-[10px] text-[var(--color-fg-subtle)] ml-1">({hint})</span>}
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(4, Math.min(100, pct))}%`,
            background:
              tone === "high"
                ? "linear-gradient(90deg, #f4a949, #e63946)"
                : "linear-gradient(90deg, #5fc77a, #4a9eff)",
          }}
        />
      </div>
    </div>
  );
}

const FWI_TONE: Record<FwiClass, "low" | "high"> = {
  "very-low": "low",
  low: "low",
  moderate: "low",
  high: "high",
  "very-high": "high",
  extreme: "high",
};

export default function RiskSummaryFloat() {
  const { risk } = useRisk();
  const { weather } = useWeather();
  const { fwi: fwiData } = useFwi();

  const peakLevel = useMemo(() => {
    const zones = risk?.zones ?? [];
    if (!zones.length) return "high" as const;
    const top = [...zones].sort((a, b) => b.dynamicScore - a.dynamicScore)[0];
    return top.riskLevel;
  }, [risk]);

  const ndviAvg = useMemo(() => {
    const zones = risk?.zones ?? [];
    if (!zones.length) return null;
    const avg =
      zones.reduce((s, z) => s + z.dynamicScore, 0) / zones.length;
    // higher score = drier vegetation, so NDVI proxy is inversely related
    return Math.max(0.05, 0.55 - avg * 0.45);
  }, [risk]);

  const lst = weather?.temperature ?? null;
  const fmcResult = nelsonFMC({
    tempC: weather?.temperature ?? null,
    humidityPct: weather?.humidity ?? null,
    precipMm24h: weather?.precipitation ?? null,
  });
  const fmc = Number.isFinite(fmcResult.value) ? fmcResult.value : null;

  const peakLabel: Record<string, { text: string; class: string }> = {
    critical: { text: "Extreme", class: "text-[var(--color-critical)]" },
    high: { text: "High", class: "text-[var(--color-accent)]" },
    medium: { text: "Moderate", class: "text-[var(--color-warning)]" },
    low: { text: "Low", class: "text-[var(--color-success)]" },
  };
  const lvl = peakLabel[peakLevel];

  return (
    <Card variant="glass" className="w-[300px] p-4">
      <div className="flex items-center justify-between">
        <div className="section-label">Risk Level Summary</div>
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${lvl.class}`}
        >
          {lvl.text}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <BarRow
          label="NDVI (Vegetation Index)"
          value={ndviAvg != null ? ndviAvg.toFixed(2) : "—"}
          pct={ndviAvg != null ? ndviAvg * 100 * 1.4 : 0}
          tone={ndviAvg != null && ndviAvg < 0.3 ? "high" : "low"}
          hint={ndviAvg != null && ndviAvg < 0.3 ? "Dry" : "Active"}
        />
        <BarRow
          label="LST (Surface Temp)"
          value={lst != null ? `${lst.toFixed(0)}°C` : "—"}
          pct={lst != null ? Math.min(100, (lst / 45) * 100) : 0}
          tone={lst != null && lst > 30 ? "high" : "low"}
        />
        <BarRow
          label="FMC (Fuel Moisture)"
          value={fmc != null ? `${fmc.toFixed(0)}%` : "—"}
          pct={fmc != null ? Math.min(100, fmc * 4) : 0}
          tone={fmc != null && fmc < 12 ? "high" : "low"}
        />
        <BarRow
          label="FWI (EFFIS index)"
          value={fwiData ? fwiData.current.fwi.toFixed(1) : "—"}
          pct={
            fwiData ? Math.min(100, (fwiData.current.fwi / 50) * 100) : 0
          }
          tone={
            fwiData
              ? FWI_TONE[fwiData.current.fwiClass as FwiClass] ?? "low"
              : "low"
          }
          hint={
            fwiData
              ? FWI_CLASS_LABEL[fwiData.current.fwiClass as FwiClass]
              : undefined
          }
        />
      </div>
    </Card>
  );
}
