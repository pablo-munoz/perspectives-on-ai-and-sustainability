import { Card } from "@/components/ui/Card";
import { Download, Code2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open data — Fire-See",
  description:
    "Download Fire-See datasets and call the public read-only API. CSV / JSON / GeoJSON. CC-BY-4.0.",
};

const ENDPOINTS = [
  {
    path: "/api/v1/zones",
    method: "GET",
    description:
      "All eight zones with current risk score, level and hotspot proximity flag.",
    formats: ["json", "geojson", "csv"],
    sample: "/api/v1/zones?format=geojson",
  },
  {
    path: "/api/fwi",
    method: "GET",
    description:
      "Today's FWI value + 7-day forecast for the Ourense centroid (FFMC/DMC/DC/ISI/BUI/FWI).",
    formats: ["json"],
    sample: "/api/fwi",
  },
  {
    path: "/api/history",
    method: "GET",
    description:
      "Aggregated risk snapshots. Range: 7d / 30d / 90d. CSV export available.",
    formats: ["json", "csv"],
    sample: "/api/history?range=30d&format=csv",
  },
  {
    path: "/api/weather",
    method: "GET",
    description: "Live AEMET observation for station 1690A (Ourense).",
    formats: ["json"],
    sample: "/api/weather",
  },
  {
    path: "/api/firms",
    method: "GET",
    description: "FIRMS VIIRS active fire detections in the Ourense bbox.",
    formats: ["json"],
    sample: "/api/firms",
  },
  {
    path: "/api/status",
    method: "GET",
    description:
      "Health of every upstream source (AEMET / FIRMS / Open-Meteo / EFFIS / GIBS).",
    formats: ["json"],
    sample: "/api/status",
  },
];

const DOWNLOADS = [
  {
    name: "Aggregate history · last 30 days",
    href: "/api/history?range=30d&format=csv",
    format: "CSV",
  },
  {
    name: "Aggregate history · last 90 days",
    href: "/api/history?range=90d&format=csv",
    format: "CSV",
  },
  {
    name: "Zones · GeoJSON",
    href: "/api/v1/zones?format=geojson",
    format: "GeoJSON",
  },
  {
    name: "Historical fire perimeters · Galicia 2022–2024",
    href: "/data/historical-fires-galicia.geojson",
    format: "GeoJSON",
  },
];

export default function DataPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Open data</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Datasets &amp; public API
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Everything Fire-See computes is exposed under a stable v1 API and as
          downloadable CSV / GeoJSON. Use freely under{" "}
          <strong className="text-[var(--color-fg)]">CC-BY-4.0</strong> with
          attribution to <em>Fire-See</em> and the underlying source providers.
        </p>
      </header>

      <Card variant="elevated" className="p-4 mb-6 bg-[var(--color-accent-soft)] border-[var(--color-accent)]/30">
        <div className="flex items-start gap-3">
          <Code2 className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-[var(--color-fg-muted)]">
            <strong className="text-[var(--color-fg)]">Rate limit</strong>:
            anonymous public access is limited to{" "}
            <strong>60 requests per IP every 10 minutes</strong>. Each
            response carries{" "}
            <code className="font-mono">X-RateLimit-Remaining</code> and{" "}
            <code className="font-mono">X-RateLimit-Reset</code> headers.
          </div>
        </div>
      </Card>

      <section className="mb-8">
        <h2 className="section-label">One-click downloads</h2>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DOWNLOADS.map((d) => (
            <li key={d.href}>
              <a
                href={d.href}
                download
                className="block p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-[var(--color-fg)] truncate">
                    {d.name}
                  </div>
                  <Download className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                  {d.format}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="section-label">API endpoints</h2>
        <ul className="mt-3 space-y-3">
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <Card variant="elevated" className="p-4">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded bg-[var(--color-success)]/15 text-[var(--color-success)]">
                      {e.method}
                    </span>
                    <code className="font-mono text-[13px] text-[var(--color-fg)]">
                      {e.path}
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {e.formats.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-fg-muted)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)]">
                  {e.description}
                </p>
                <pre className="mt-2 p-2 rounded bg-black/40 border border-[var(--color-border)] text-[11px] overflow-x-auto">
{`curl https://your-host${e.sample}`}
                </pre>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="section-label">Attribution example</h2>
        <pre className="mt-3 p-3 rounded-md border border-[var(--color-border)] bg-black/40 text-[11.5px] overflow-x-auto">
{`Risk data: Fire-See (CC-BY-4.0).
Underlying sources: AEMET, NASA FIRMS, Open-Meteo,
Copernicus EFFIS, Sentinel-2.`}
        </pre>
      </section>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Need higher limits, push delivery, or commercial use?{" "}
        <a
          href="/support"
          className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
        >
          Contact <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}
