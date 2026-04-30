"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useFirms, useWeather } from "@/lib/hooks";
import type { DerivedAlert } from "@/lib/hooks";
import { Megaphone, X, Layers } from "lucide-react";
import { toast } from "sonner";

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
            <Button variant="outline" size="sm" onClick={onDismiss}>
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
          <div
            className="relative flex-1 min-h-[220px]"
            style={{
              background:
                "radial-gradient(circle at 60% 45%, rgba(255,107,26,0.45), rgba(230,57,70,0.25) 30%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(74,158,255,0.15), transparent 50%), #050608",
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-40"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <path
                  key={i}
                  d={`M0 ${10 + i * 6} Q 50 ${(i * 13) % 35} 100 ${
                    20 + i * 5
                  } T 200 ${15 + i * 6}`}
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.2"
                  strokeWidth="0.4"
                />
              ))}
            </svg>
            {hotspot && (
              <div
                className="absolute hotspot-pulse hotspot-high"
                style={{ left: "58%", top: "42%" }}
              >
                <div className="hotspot-core" />
              </div>
            )}
            <button className="absolute bottom-3 right-3 h-8 w-8 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-fg-muted)]">
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>

      {/* Deployed resources */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center justify-between">
          <div className="section-label">Deployed Resources</div>
          <button className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)] font-semibold hover:text-[var(--color-accent-hi)]">
            Manage Units
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ResourceTile
            icon="🚒"
            name="Engine 12, 14"
            status="ETA 12 min"
            tone="warning"
          />
          <ResourceTile
            icon="🚁"
            name="Air-Attack 4"
            status="In Transit"
            tone="warning"
          />
          <ResourceTile icon="👷" name="Crew Charlie" status="On Scene" tone="success" />
        </div>
      </Card>
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

function ResourceTile({
  icon,
  name,
  status,
  tone,
}: {
  icon: string;
  name: string;
  status: string;
  tone: "warning" | "success";
}) {
  const cls =
    tone === "warning"
      ? "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]"
      : "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]";
  const text =
    tone === "warning"
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-success)]";
  return (
    <div className={`rounded-lg border ${cls} px-3 py-3 flex items-center gap-3`}>
      <div className="h-9 w-9 rounded-md bg-black/30 flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <div className="text-[12.5px] font-semibold">{name}</div>
        <div className={`text-[10px] uppercase tracking-[0.14em] ${text} font-semibold`}>
          {status}
        </div>
      </div>
    </div>
  );
}
