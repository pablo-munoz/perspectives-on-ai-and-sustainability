import { Card } from "@/components/ui/Card";
import { riskZones, RISK_COLORS, RISK_LABELS } from "@/lib/mock-data";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { haversineKm } from "@/lib/geo";
import { Flame, Thermometer, Droplet, Wind, MapPin, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ZoneSparklines from "./ZoneSparklines";
import ZoneRiskHistory from "./ZoneRiskHistory";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ id: string }>;
}

const PROXIMITY_KM = 5.5;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) return { title: "Zone not found · Fire-See" };
  return {
    title: `${zone.name} · Fire-See`,
    description: `Wildfire risk profile for ${zone.name} — Ourense, Galicia. Live FWI, weather, hotspots, vegetation indices.`,
    openGraph: {
      title: `${zone.name} · Fire-See`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return riskZones.map((z) => ({ id: z.id }));
}

export default async function ZoneDetailPage({ params }: PageProps) {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) notFound();

  const [weather, firms] = await Promise.all([
    fetchWeatherCached(),
    fetchFirms(),
  ]);

  const hotspotsNearby = firms.hotspots.filter((h) =>
    haversineKm(h.lat, h.lng, zone.center[0], zone.center[1]) < PROXIMITY_KM * 2
  );

  const allRisk = await computeDynamicRiskLive(
    {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
    },
    [...new Set(hotspotsNearby.map(() => zone.id))]
  );
  const result = allRisk.find((r) => r.zoneId === zone.id);
  const score = result?.dynamicScore ?? zone.riskScore;
  const level = result?.riskLevel ?? zone.riskLevel;
  const color = RISK_COLORS[level];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1100px] mx-auto pb-20">
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
          Zone deep dive
        </div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-3xl font-bold">{zone.name}</h1>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded"
            style={{
              background: `${color}22`,
              color,
              border: `1px solid ${color}55`,
            }}
          >
            {RISK_LABELS[level]} risk
          </span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-[12px] text-[var(--color-fg-muted)] flex-wrap">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {zone.center[0].toFixed(3)}°N, {Math.abs(zone.center[1]).toFixed(3)}°W
          </span>
          <span>· {zone.vegetation}</span>
          <span>· slope {zone.slopeDeg}°</span>
          <Link
            href="/methodology"
            className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            Methodology <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Hero gauge */}
      <Card variant="elevated" className="p-6 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="section-label">Current risk score</div>
            <div className="mt-3 flex items-baseline gap-3">
              <span
                className="font-display text-6xl font-bold tabular"
                style={{ color }}
              >
                {Math.round(score * 100)}
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color }}
              >
                %
              </span>
            </div>
            <div className="mt-2 text-[12px] text-[var(--color-fg-muted)]">
              {result?.modifiersApplied?.length
                ? `Modifiers active: ${result.modifiersApplied.join(", ")}`
                : "No active weather modifiers."}
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(4, Math.min(100, score * 100))}%`,
                  background: color,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile
              icon={<Thermometer className="w-3.5 h-3.5" />}
              label="Temperature"
              value={
                weather.temperature != null
                  ? `${weather.temperature.toFixed(1)}°C`
                  : "—"
              }
            />
            <Tile
              icon={<Droplet className="w-3.5 h-3.5" />}
              label="Humidity"
              value={
                weather.humidity != null ? `${weather.humidity}%` : "—"
              }
            />
            <Tile
              icon={<Wind className="w-3.5 h-3.5" />}
              label="Wind"
              value={
                weather.windSpeed != null
                  ? `${weather.windSpeed} km/h ${weather.windDirection ?? ""}`.trim()
                  : "—"
              }
            />
            <Tile
              icon={<Flame className="w-3.5 h-3.5" />}
              label="Hotspots <11 km"
              value={String(hotspotsNearby.length)}
            />
          </div>
        </div>
      </Card>

      {/* Sparkline panel client-side */}
      <ZoneSparklines zoneId={zone.id} />

      {/* Risk history client-side */}
      <ZoneRiskHistory zoneId={zone.id} />

      {/* Embed snippet */}
      <Card variant="elevated" className="p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-label">Embed this zone</div>
            <p className="mt-2 text-[12px] text-[var(--color-fg-muted)] max-w-md">
              Drop the live risk badge for {zone.name} into a council site or
              blog. Refreshes server-side every 5 minutes.
            </p>
          </div>
        </div>
        <pre className="mt-3 p-3 rounded-md border border-[var(--color-border)] bg-black/40 text-[11px] overflow-x-auto">
{`<iframe
  src="/embed/zone/${zone.id}"
  width="460" height="200"
  style="border:0;border-radius:14px"
  loading="lazy"
></iframe>`}
        </pre>
      </Card>

      <Card variant="elevated" className="p-5 text-[12px] text-[var(--color-fg-muted)]">
        <div className="section-label mb-2">Open data</div>
        Subscribe to the JSON feed via{" "}
        <code className="font-mono text-[var(--color-fg)]">
          /api/zones/{zone.id}/ndvi-history
        </code>{" "}
        and{" "}
        <code className="font-mono text-[var(--color-fg)]">
          /api/history?zone={zone.id}&range=30d&format=csv
        </code>
        .
      </Card>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)] flex items-center gap-1.5">
        <span className="text-[var(--color-fg-muted)]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-base font-semibold tabular">
        {value}
      </div>
    </div>
  );
}
