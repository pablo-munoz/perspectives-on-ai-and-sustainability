"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { archiveAlert, useFirms, useWeather } from "@/lib/hooks";
import type { DerivedAlert } from "@/lib/hooks";
import { Megaphone, X } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const SatelliteView = dynamic(
  () => import("@/components/alerts/SatelliteView"),
  { ssr: false }
);

interface AlertDetailProps {
  alert: DerivedAlert;
  onDismiss: () => void;
}

export function AlertDetail({ alert, onDismiss }: AlertDetailProps) {
  const { weather } = useWeather();
  const { firms } = useFirms();
  const hotspot = firms?.hotspots?.[0];
  const dt = new Date(alert.timestamp);
  const id = `WF-${dt.getUTCFullYear()}-${String(
    dt.getUTCMonth() + 1
  ).padStart(2, "0")}-${alert.id.slice(-4).toUpperCase()}`;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center h-6 px-2 rounded bg-[var(--color-critical-soft)] text-[var(--color-critical)] text-[10px] font-bold uppercase tracking-[0.14em]">
              Critical Alert
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] tabular">
              ID: {id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                toast.warning("Emergency broadcast (demo)", {
                  description: "Dispatch network would be alerted.",
                })
              }
            >
              <Megaphone className="w-3.5 h-3.5" />
              Emergency Broadcast
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await archiveAlert(alert, "Dismissed by operator");
                  toast.success("Alert archived");
                } catch (err) {
                  toast.error("Failed to archive alert");
                  console.error(err);
                }
                onDismiss();
              }}
            >
              <X className="w-3.5 h-3.5" />
              Dismiss Alert
            </Button>
          </div>
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          {alert.title}
        </h2>
        <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
          {alert.description}
        </p>
      </Card>

      {/* Telemetry + Satellite */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card variant="elevated" className="p-5 lg:col-span-2 space-y-5">
          <div className="section-label">Environmental Telemetry</div>
          <Telemetry
            label="Temperature"
            value={
              weather?.temperature != null
                ? weather.temperature.toFixed(0)
                : "—"
            }
            unit="°C"
            hint={
              weather?.temperature != null && weather.temperature > 30
                ? "+12% vs 1hr ago"
                : "Within range"
            }
            tone={weather?.temperature != null && weather.temperature > 30 ? "up" : "neutral"}
          />
          <Telemetry
            label="Humidity"
            value={
              weather?.humidity != null
                ? weather.humidity.toFixed(0)
                : "—"
            }
            unit="%"
            hint={
              weather?.humidity != null && weather.humidity < 30
                ? "Critical Dry"
                : "Stable"
            }
            tone={weather?.humidity != null && weather.humidity < 30 ? "up" : "neutral"}
          />
          <Telemetry
            label="Wind Vector"
            value={
              weather?.windSpeed != null
                ? weather.windSpeed.toFixed(0)
                : "—"
            }
            unit="kn"
            hint={`${weather?.windDirection ?? "—"} Direction`}
            tone="neutral"
          />
        </Card>

        <Card variant="elevated" className="p-0 overflow-hidden lg:col-span-3 flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="section-label">Satellite View</div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
              MODIS-Terra · {dt.toUTCString().slice(17, 22)} Orbit
            </span>
          </div>
          <div className="relative flex-1 min-h-[220px] bg-black overflow-hidden">
            <SatelliteView
              lat={hotspot?.lat ?? null}
              lng={hotspot?.lng ?? null}
              layer="MODIS_Terra"
            />
          </div>
        </Card>
      </div>

      {/* Recent satellite detections (FIRMS) */}
      <RecentDetections />
    </div>
  );
}

function RecentDetections() {
  const { firms } = useFirms();
  const hotspots = (firms?.hotspots ?? []).slice(0, 4);

  if (hotspots.length === 0) {
    return (
      <Card variant="elevated" className="p-5">
        <div className="section-label">Recent Detections</div>
        <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
          No active fire detections in the FIRMS feed for this region.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="p-5">
      <div className="flex items-center justify-between">
        <div className="section-label">Recent Detections · {firms?.source ?? "FIRMS"}</div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {firms?.count ?? hotspots.length} total
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hotspots.map((h) => (
          <DetectionTile
            key={h.id}
            satellite={h.satellite}
            confidence={h.confidence}
            confidenceLabel={h.confidenceLabel}
            brightness={h.brightness}
            timestamp={h.timestamp}
          />
        ))}
      </div>
    </Card>
  );
}

function DetectionTile({
  satellite,
  confidence,
  confidenceLabel,
  brightness,
  timestamp,
}: {
  satellite: string;
  confidence: number;
  confidenceLabel: string;
  brightness: number;
  timestamp: string;
}) {
  const tone =
    confidenceLabel === "high"
      ? "border-[var(--color-critical)]/30 bg-[var(--color-critical-soft)] text-[var(--color-critical)]"
      : confidenceLabel === "low"
      ? "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
      : "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)]";
  const ts = new Date(timestamp);
  const when = `${ts.getUTCHours().toString().padStart(2, "0")}:${ts
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}Z`;
  return (
    <div className={`rounded-lg border ${tone} px-3 py-3`}>
      <div className="text-[10px] uppercase tracking-[0.14em] font-semibold opacity-80">
        {satellite}
      </div>
      <div className="mt-1 flex items-baseline gap-2 text-[var(--color-fg)]">
        <span className="font-display text-xl font-semibold tabular">
          {confidence.toFixed(0)}
        </span>
        <span className="text-xs opacity-70">% conf</span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
        {brightness.toFixed(0)} K · {when}
      </div>
    </div>
  );
}

function Telemetry({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  tone: "up" | "down" | "neutral";
}) {
  const hintColor =
    tone === "up"
      ? "text-[var(--color-critical)]"
      : tone === "down"
      ? "text-[var(--color-success)]"
      : "text-[var(--color-fg-muted)]";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tabular">
          {value}
        </span>
        <span className="text-sm text-[var(--color-fg-muted)] font-medium">
          {unit}
        </span>
        {hint && (
          <span className={`ml-auto text-[10px] uppercase tracking-[0.14em] ${hintColor}`}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

