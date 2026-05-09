import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — Fire-See",
};

interface Entry {
  version: string;
  date: string;
  changes: string[];
}

const ENTRIES: Entry[] = [
  {
    version: "0.4 — Completeness pass",
    date: "2026-05",
    changes: [
      "Trust layer: /methodology, /glossary, /status, /data with public v1 API.",
      "MetricInfo popover wired across the dashboard with ES/EN copy.",
      "/zones/[id] per-zone deep dive + auto-OG cards (1200×630).",
      "Sparkline embed widget at /embed/sparkline/[id].",
      "RSS feed at /feed.xml + iCal at /alerts.ics.",
      "/incidents page — DBSCAN clustering of FIRMS hotspots.",
      "/drought page — KBDI / SPI / days-since-rain from ERA5.",
      "/air page — Open-Meteo Air Quality (CAMS-derived).",
      "What-if sensitivity slider on /map.",
      "Year-over-year FWI comparison on /analytics.",
      "Daily print-friendly briefing at /briefing.",
      "Burn-severity methodology page documenting NBR / dNBR.",
      "Press kit at /press with embed snippets and downloadable feeds.",
      "Dark / light theme toggle + print stylesheet.",
      "Skeleton loaders + dashboard error boundary + global error boundary.",
    ],
  },
  {
    version: "0.3 — MVP improvements",
    date: "2026-05",
    changes: [
      "Critical fixes: removed fake bootstrap snapshots; CRON_SECRET enforced; haversine proximity; stub buttons hidden.",
      "FWI Van Wagner integration (lib/fwi.ts + /api/fwi) with Open-Meteo daily forecast.",
      "Map overlays: NASA GIBS true-color, EFFIS WMS, historical fires.",
      "Time-machine slider replaying last 30 days of zone scores.",
      "Hotspot context panel: Overpass POIs + ORS isochrones.",
      "Forecast ribbon (7-day FWI strip) and 90-day risk heatmap calendar.",
      "Keyboard shortcuts (1-4 nav, ? help) and mobile drawer.",
      "Embed widgets at /embed/zone/[id] and /embed.",
      "ML v2 training script with FWI features, calibration and bootstrap uncertainty.",
      "ColorBrewer YlOrRd palette across risk levels.",
    ],
  },
  {
    version: "0.2 — Live ML inference",
    date: "2026-04",
    changes: [
      "Random Forest exported as JSON tree dump and run client-side.",
      "Hourly Vercel cron writes risk snapshots to Upstash KV.",
      "/api/history with 7d / 30d / 90d aggregation.",
      "AEMET KV-backed cache with stale-on-failure fallback.",
    ],
  },
  {
    version: "0.1 — Prototype",
    date: "2026-04",
    changes: [
      "Mapbox 3-D map with eight Ourense zones.",
      "AEMET weather + FIRMS active fire detections.",
      "Static risk classifier seeded from MCD64A1 burned-area labels.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Release log</div>
        <h1 className="mt-2 font-display text-3xl font-bold">Changelog</h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          What shipped, when. Versions roughly track sprint boundaries.
        </p>
      </header>

      <ol className="space-y-4">
        {ENTRIES.map((e) => (
          <li key={e.version}>
            <Card variant="elevated" className="p-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h2 className="font-display text-lg font-bold">{e.version}</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                  {e.date}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--color-fg-muted)] list-disc pl-5">
                {e.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
