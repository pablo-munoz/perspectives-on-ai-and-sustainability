"use client";

import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { RiskZone, RiskLevel } from "@/lib/mock-data";
import { Activity, Thermometer, Droplet, Wind, MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

interface ZoneCardProps {
  zone: RiskZone;
  liveLevel?: RiskLevel;
  liveScore?: number;
  weather?: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
  } | null;
  sensorsActive?: number;
  sensorsTotal?: number;
}

const gradients: Record<RiskLevel, string> = {
  critical:
    "from-[#3a0a0a] via-[#1c0507] to-[#0a0303] ring-1 ring-[var(--color-critical)]/40",
  high:
    "from-[#3a1a06] via-[#1c0d04] to-[#0a0503] ring-1 ring-[var(--color-accent)]/40",
  medium:
    "from-[#3a2906] via-[#1c1503] to-[#0a0703] ring-1 ring-[var(--color-warning)]/40",
  low:
    "from-[#0a2a14] via-[#04140a] to-[#020a05] ring-1 ring-[var(--color-success)]/40",
};

const accentBlobs: Record<RiskLevel, string> = {
  critical: "bg-[var(--color-critical)]",
  high: "bg-[var(--color-accent)]",
  medium: "bg-[var(--color-warning)]",
  low: "bg-[var(--color-success)]",
};

export function ZoneCard({
  zone,
  liveLevel,
  weather,
  sensorsActive = 22,
  sensorsTotal = 24,
}: ZoneCardProps) {
  const level = liveLevel ?? zone.riskLevel;

  return (
    <Card
      variant="elevated"
      className="overflow-hidden hover:border-[var(--color-border-strong)] transition-colors group"
    >
      {/* Visual hero */}
      <div
        className={`relative h-36 bg-gradient-to-br ${gradients[level]} overflow-hidden`}
      >
        {/* fake topographic lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30 mix-blend-screen"
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${20 + i * 10} Q50 ${i % 2 ? 5 : 35 + i * 8} 100 ${
                25 + i * 7
              } T200 ${20 + i * 9}`}
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="0.4"
            />
          ))}
        </svg>
        <div
          className={`absolute inset-0 bg-radial-gradient ${
            accentBlobs[level]
          } opacity-30`}
          style={{
            background: `radial-gradient(circle at 30% 60%, var(--tw-gradient-from, currentColor), transparent 60%)`,
          }}
        />
        <div className="absolute top-3 right-3">
          <RiskBadge level={level} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight truncate">
              {zone.name}
            </h3>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] tabular">
              Coords {zone.center[0].toFixed(3)}°N, {Math.abs(zone.center[1]).toFixed(3)}°W
            </div>
          </div>
          <button
            className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] -mr-1"
            aria-label="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Stat
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Active Sensors"
            value={`${sensorsActive} / ${sensorsTotal}`}
          />
          <Stat
            icon={<Thermometer className="w-3.5 h-3.5" />}
            label="Temp Avg"
            value={
              weather?.temperature != null
                ? `${weather.temperature.toFixed(1)}°C`
                : "—"
            }
          />
          <Stat
            icon={<Droplet className="w-3.5 h-3.5" />}
            label="Humidity"
            value={
              weather?.humidity != null
                ? `${weather.humidity.toFixed(0)}%`
                : "—"
            }
          />
          <Stat
            icon={<Wind className="w-3.5 h-3.5" />}
            label="Wind"
            value={
              weather?.windSpeed != null
                ? `${weather.windSpeed.toFixed(0)} km/h`
                : "—"
            }
          />
        </div>
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[var(--color-fg-subtle)]">{icon}</div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {label}
        </div>
        <div className="text-[12.5px] font-semibold tabular text-[var(--color-fg)]">
          {value}
        </div>
      </div>
    </div>
  );
}

export function AddZoneCard() {
  return (
    <button
      onClick={() =>
        // sonner side-effect not allowed in server component default; lazy import
        import("sonner").then((s) =>
          s.toast.message("New zones not enabled in demo")
        )
      }
      className="rounded-[14px] border border-dashed border-[var(--color-border-strong)] bg-transparent hover:bg-white/[0.02] transition-colors p-6 flex flex-col items-center justify-center text-center min-h-[300px]"
    >
      <div className="h-10 w-10 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-fg-muted)] text-2xl font-light">
        +
      </div>
      <div className="mt-3 font-display text-base font-semibold text-[var(--color-fg)]">
        Add New Zone
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] leading-relaxed">
        Define perimeter
        <br />& deploy sensors
      </div>
    </button>
  );
}
