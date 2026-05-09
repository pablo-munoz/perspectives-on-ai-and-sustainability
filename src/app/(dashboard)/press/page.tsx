import { Card } from "@/components/ui/Card";
import { riskZones } from "@/lib/mock-data";
import { Download, Image as ImageIcon, Rss, Calendar, Code } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press kit — Fire-See",
  description:
    "Embeddable widgets, OG cards, RSS / iCal feeds and downloadable assets for journalists covering Galicia wildfire risk.",
};

const ASSETS = [
  {
    icon: Rss,
    label: "RSS feed",
    description: "High-risk zone alerts, refreshed every 10 minutes.",
    href: "/feed.xml",
    cta: "Subscribe",
  },
  {
    icon: Calendar,
    label: "iCal feed",
    description:
      "Subscribe to Very-High / Extreme FWI days. Works in Google Calendar, Outlook, Apple Calendar.",
    href: "/alerts.ics",
    cta: "Add to calendar",
  },
  {
    icon: Download,
    label: "90-day history (CSV)",
    description: "Aggregate risk snapshots — daily peak / avg per zone.",
    href: "/api/history?range=90d&format=csv",
    cta: "Download CSV",
  },
  {
    icon: Download,
    label: "Zones GeoJSON",
    description: "Current risk score per zone as GeoJSON points.",
    href: "/api/v1/zones?format=geojson",
    cta: "Download GeoJSON",
  },
  {
    icon: Download,
    label: "Historical fire perimeters (2022-2024)",
    description: "FIRMS-derived burned-area approximation for Galicia.",
    href: "/data/historical-fires-galicia.geojson",
    cta: "Download GeoJSON",
  },
];

export default function PressPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">For journalists & researchers</div>
        <h1 className="mt-2 font-display text-3xl font-bold">Press kit</h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Everything you need to cover wildfire risk in Galicia: live feeds,
          downloadable datasets, embeddable widgets and per-zone Open Graph
          cards for social sharing. All available under{" "}
          <strong className="text-[var(--color-fg)]">CC-BY-4.0</strong>.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="section-label">Live feeds &amp; downloads</h2>
        <ul className="mt-3 space-y-3">
          {ASSETS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.href}>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="h-9 w-9 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px]">
                          {a.label}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">
                          {a.description}
                        </div>
                      </div>
                    </div>
                    <a
                      href={a.href}
                      className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--color-accent)] text-black text-[10.5px] font-bold uppercase tracking-[0.14em] hover:bg-[var(--color-accent-hi)] transition-colors"
                    >
                      {a.cta}
                    </a>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="section-label inline-flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" /> Per-zone Open Graph cards
        </h2>
        <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)]">
          Each zone exposes an auto-generated 1200×630 OG image with the
          live risk score, level and weather tiles. Use them in articles,
          tweets or thumbnails.
        </p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {riskZones.map((z) => (
            <li
              key={z.id}
              className="flex items-center justify-between border border-[var(--color-border)] rounded-md px-3 py-2 text-[13px]"
            >
              <span className="truncate">{z.name}</span>
              <a
                href={`/zones/${z.id}/opengraph-image`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-accent)] hover:underline text-[10.5px] uppercase tracking-[0.14em] font-bold"
              >
                Open ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="section-label inline-flex items-center gap-2">
          <Code className="w-3.5 h-3.5" /> Embed snippets
        </h2>
        <Card variant="elevated" className="mt-3 p-4">
          <div className="text-[11.5px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Risk badge
          </div>
          <pre className="mt-2 p-3 rounded bg-black/40 border border-[var(--color-border)] text-[11px] overflow-x-auto">
{`<iframe
  src="/embed/zone/z1"
  width="460" height="200"
  style="border:0;border-radius:14px"
  loading="lazy"
></iframe>`}
          </pre>

          <div className="mt-4 text-[11.5px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Sparkline strip (newsroom inline)
          </div>
          <pre className="mt-2 p-3 rounded bg-black/40 border border-[var(--color-border)] text-[11px] overflow-x-auto">
{`<iframe
  src="/embed/sparkline/z1"
  width="320" height="80"
  style="border:0"
  loading="lazy"
></iframe>`}
          </pre>
        </Card>
      </section>

      <section className="mb-4 text-[12px] text-[var(--color-fg-muted)]">
        <h2 className="section-label">Boilerplate</h2>
        <p className="mt-2 leading-relaxed">
          Fire-See is an open, research-grade wildfire risk dashboard for
          eight forest zones in Ourense, Galicia. It combines AEMET weather,
          NASA FIRMS satellite detections, Copernicus EFFIS, Open-Meteo FWI
          and a Random Forest model trained on Sentinel-2 vegetation indices.
        </p>
        <p className="mt-2 leading-relaxed">
          Suggested citation: Fire-See — wildfire risk dashboard for Galicia,
          2026. Available at{" "}
          <code className="font-mono">
            https://perspectives-on-ai-and-sustainabili.vercel.app
          </code>
          .
        </p>
      </section>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        For interviews or specific data extracts, see the{" "}
        <a className="text-[var(--color-accent)] hover:underline" href="/support">
          Support page
        </a>{" "}
        for the operations-team contact.
      </p>
    </div>
  );
}
