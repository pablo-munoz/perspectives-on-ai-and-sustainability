import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";
import { Flame } from "lucide-react";

export const metadata: Metadata = {
  title: "Burn severity — Fire-See",
  description:
    "Post-event burn-severity methodology using Sentinel-2 NBR / dNBR.",
};

const SEVERITY_BANDS = [
  { label: "Unburned / Enhanced regrowth", range: "dNBR < +0.10", color: "#5fc77a" },
  { label: "Low severity", range: "+0.10 → +0.27", color: "#fed976" },
  { label: "Moderate-low", range: "+0.27 → +0.44", color: "#feb24c" },
  { label: "Moderate-high", range: "+0.44 → +0.66", color: "#fd8d3c" },
  { label: "High severity", range: "≥ +0.66", color: "#bd0026" },
];

export default function BurnSeverityPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Post-event analysis</div>
        <h1 className="mt-2 font-display text-3xl font-bold inline-flex items-center gap-3">
          <Flame className="w-6 h-6 text-[var(--color-accent)]" />
          Burn severity (NBR / dNBR)
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Once an incident is contained, satellite imagery can quantify how
          much of the canopy actually burned. Fire-See uses the Normalized
          Burn Ratio from Sentinel-2 — the Copernicus / EU standard for
          post-fire damage assessment in Europe.
        </p>
      </header>

      <Card variant="elevated" className="p-5 mb-5 bg-[var(--color-warning-soft)] border-[var(--color-warning)]/30">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-warning)]">
          Preview
        </div>
        <p className="mt-2 text-[13px] text-[var(--color-fg-muted)]">
          The live Sentinel-2 STAC pipeline lands in a future release. This
          page documents the methodology and bands so reviewers, journalists
          and researchers know exactly what to expect when the layer goes
          live.
        </p>
      </Card>

      <section className="mb-6">
        <h2 className="section-label">Method</h2>
        <Card variant="elevated" className="mt-3 p-5 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
          <p>
            <strong className="text-[var(--color-fg)]">NBR</strong> — Normalized
            Burn Ratio — uses Sentinel-2 bands B8A (NIR) and B12 (SWIR) and
            highlights vegetation health and char.
          </p>
          <pre className="mt-3 font-mono text-[12px] bg-black/40 p-3 rounded">
{`NBR = (B8A − B12) / (B8A + B12)`}
          </pre>
          <p className="mt-3">
            <strong className="text-[var(--color-fg)]">dNBR</strong> — change in
            NBR before and after the fire — quantifies severity. Computed for
            cloud-free Sentinel-2 L2A scenes within ±10 days of the burn
            window.
          </p>
          <pre className="mt-3 font-mono text-[12px] bg-black/40 p-3 rounded">
{`dNBR = NBR_pre − NBR_post`}
          </pre>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="section-label">Severity bands (USGS / Key & Benson 2006)</h2>
        <ul className="mt-3 space-y-2">
          {SEVERITY_BANDS.map((b) => (
            <li
              key={b.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ background: b.color }}
                aria-hidden
              />
              <span className="flex-1 text-[13px] text-[var(--color-fg)]">
                {b.label}
              </span>
              <span className="text-[11px] text-[var(--color-fg-muted)] tabular">
                {b.range}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4">
        <h2 className="section-label">Pipeline (planned)</h2>
        <ol className="mt-3 list-decimal pl-5 text-[13px] text-[var(--color-fg-muted)] space-y-1.5">
          <li>
            For each closed incident on <code>/incidents</code>, query the
            Copernicus Data Space STAC for the closest cloud-free Sentinel-2
            L2A scenes pre and post burn window.
          </li>
          <li>
            Read B8A and B12 directly from the Cloud-Optimized GeoTIFFs (no
            full download) restricted to the incident bounding box +5 km buffer.
          </li>
          <li>
            Compute pixel-wise NBR before / after, then dNBR. Mask cloud and
            water using the L2A SCL band.
          </li>
          <li>
            Vectorize severity bands into GeoJSON polygons and persist in KV
            for that incident id.
          </li>
        </ol>
      </section>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Until then, see the{" "}
        <a className="text-[var(--color-accent)] hover:underline" href="/incidents">
          Incidents
        </a>{" "}
        page for active and recent fires, and the{" "}
        <a
          className="text-[var(--color-accent)] hover:underline"
          href="/methodology"
        >
          Methodology
        </a>{" "}
        page for sensor and data-source documentation.
      </p>
    </div>
  );
}
