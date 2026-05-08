import "@/app/globals.css";
import { riskZones, RISK_COLORS, RISK_LABELS } from "@/lib/mock-data";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { haversineKm } from "@/lib/geo";
import { Flame } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 300;

const PROXIMITY_KM = 5.5;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  return {
    title: zone ? `${zone.name} · Fire-See` : "Fire-See embed",
    robots: { index: false },
  };
}

export default async function EmbedZonePage({ params }: PageProps) {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) notFound();

  const [weather, firms] = await Promise.all([
    fetchWeatherCached(),
    fetchFirms(),
  ]);

  const hotspotZones = (() => {
    const set = new Set<string>();
    for (const h of firms.hotspots) {
      for (const z of riskZones) {
        if (haversineKm(h.lat, h.lng, z.center[0], z.center[1]) < PROXIMITY_KM) {
          set.add(z.id);
        }
      }
    }
    return [...set];
  })();

  const all = await computeDynamicRiskLive(
    {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
    },
    hotspotZones
  );

  const result = all.find((r) => r.zoneId === zone.id);
  const score = result?.dynamicScore ?? zone.riskScore;
  const level = result?.riskLevel ?? zone.riskLevel;
  const color = RISK_COLORS[level];

  const updated = new Date(weather.lastUpdated || Date.now()).toLocaleString(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      timeZone: "Europe/Madrid",
    }
  );

  return (
    <main
      className="h-screen w-screen flex items-center justify-center p-3 bg-[var(--color-bg)]"
      style={{ minHeight: 160 }}
    >
      <a
        href={`/zones?zone=${zone.id}`}
        target="_top"
        className="block w-full max-w-[460px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] transition-colors p-4 no-underline"
        rel="noreferrer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
              Wildfire risk · Galicia
            </div>
            <div className="mt-1 font-display text-xl font-bold text-[var(--color-fg)] truncate">
              {zone.name}
            </div>
          </div>
          <div
            className="shrink-0 h-10 w-10 rounded-md flex items-center justify-center"
            style={{ background: color, boxShadow: `0 6px 18px -6px ${color}` }}
          >
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <div
            className="font-display text-3xl font-bold tabular"
            style={{ color }}
          >
            {Math.round(score * 100)}%
          </div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color }}
          >
            {RISK_LABELS[level]}
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(4, Math.min(100, score * 100))}%`,
              background: color,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          <span>Updated {updated}</span>
          <span className="text-[var(--color-accent)] font-semibold">
            Powered by Fire-See
          </span>
        </div>
      </a>
    </main>
  );
}
