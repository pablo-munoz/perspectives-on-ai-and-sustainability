import { Card } from "@/components/ui/Card";
import { GLOSSARY } from "@/lib/glossary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Fire-See",
  description:
    "Data sources, model card and known limitations of Fire-See's wildfire risk dashboard.",
};

const SECTIONS = [
  { id: "overview", title: "What this dashboard is (and is not)" },
  { id: "sources", title: "Data sources" },
  { id: "model", title: "ML model" },
  { id: "fwi", title: "FWI computation" },
  { id: "performance", title: "Performance & validation" },
  { id: "limitations", title: "Known limitations" },
  { id: "version", title: "Version & reproducibility" },
  { id: "citation", title: "Citation" },
];

const SOURCES = [
  {
    name: "AEMET Open Data",
    purpose: "Hourly weather observations · station 1690A (Ourense).",
    refresh: "5 min",
    license: "CC-BY 4.0",
  },
  {
    name: "NASA FIRMS · VIIRS 375 m",
    purpose: "Active fire / thermal anomaly detections.",
    refresh: "10 min",
    license: "Public domain",
  },
  {
    name: "Open-Meteo Forecast",
    purpose: "Daily Tmax / RH min / wind / precipitation for 7-day FWI run.",
    refresh: "1 h",
    license: "CC-BY 4.0",
  },
  {
    name: "Copernicus EFFIS",
    purpose: "European FWI raster (WMS overlay).",
    refresh: "Daily",
    license: "© European Union, Copernicus",
  },
  {
    name: "NASA GIBS",
    purpose: "MODIS Terra true-color tile layer.",
    refresh: "Daily",
    license: "Public domain",
  },
  {
    name: "OpenStreetMap · Overpass",
    purpose: "Nearby fire stations, hospitals, water points.",
    refresh: "On demand",
    license: "ODbL · © OSM contributors",
  },
  {
    name: "OpenRouteService",
    purpose: "Drive-time isochrones (10 / 15 min).",
    refresh: "On demand",
    license: "© HeiGIT",
  },
  {
    name: "Copernicus Sentinel-2",
    purpose: "NDVI / NDMI per zone (refreshed weekly).",
    refresh: "Weekly",
    license: "Modified Copernicus Sentinel data",
  },
  {
    name: "MITECO · EGIF",
    purpose: "Historical fire context (Galicia).",
    refresh: "Annual",
    license: "© MITECO",
  },
];

const FEATURES = [
  { name: "elevation", weight: "19.8 %" },
  { name: "LST", weight: "18.1 %" },
  { name: "dist_urban", weight: "16.4 %" },
  { name: "slope", weight: "12.4 %" },
  { name: "NDMI", weight: "11.9 %" },
  { name: "NDVI", weight: "11.9 %" },
  { name: "aspect", weight: "9.5 %" },
];

export default function MethodologyPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-8">
        <div className="section-label">Documentation</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Fire-See methodology
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          How Fire-See builds the risk numbers you see on the dashboard, which
          datasets feed them, what the model can and cannot do, and how to cite
          this work.
        </p>
      </header>

      <nav className="mb-8 p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          Table of contents
        </div>
        <ol className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-[var(--color-accent)] hover:underline"
              >
                {String(i + 1).padStart(2, "0")} · {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="overview" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          What this dashboard is (and is not)
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Fire-See is a research-grade public dashboard that aggregates open
          datasets to estimate wildfire risk for eight forest zones in Ourense
          (Galicia, Spain). It is{" "}
          <strong className="text-[var(--color-fg)]">not</strong> a substitute
          for official emergency channels. For active emergencies, contact{" "}
          <strong className="text-[var(--color-fg)]">112</strong> or consult
          the Xunta Emerxencias portal.
        </p>
      </section>

      <section id="sources" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">Data sources</h2>
        <Card variant="elevated" className="mt-3 p-0 overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-white/[0.03]">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Use</th>
                <th className="px-4 py-2">Refresh</th>
                <th className="px-4 py-2">License</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr
                  key={s.name}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-4 py-2 font-semibold">{s.name}</td>
                  <td className="px-4 py-2 text-[var(--color-fg-muted)]">
                    {s.purpose}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-fg-muted)] tabular">
                    {s.refresh}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-fg-subtle)] text-[11px]">
                    {s.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="model" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">ML model</h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          V3 (May 2026): a Random Forest classifier with 200 trees,
          min-samples-leaf = 2, trained on 2929 samples drawn from MCD64A1
          burned-area pixels and matched non-burned pixels across 2018–2022
          fire seasons (May–Sep). Sampling is restricted to ESA WorldCover
          tree-cover / shrubland / grassland classes so non-burns are
          potentially burnable. Burned and non-burned classes share the
          same DOY distribution by paired sampling — without this, the
          model would trivially separate classes via seasonal weather.
          Inference runs as a JS forward-pass over the exported tree dump
          per request, modulated by live weather modifiers and per-zone
          NDVI/NDMI overrides from the weekly GEE refresh.
        </p>

        <Card variant="elevated" className="mt-4 p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Feature importance
          </div>
          <ul className="mt-3 space-y-1.5">
            {FEATURES.map((f) => {
              const w = parseFloat(f.weight) / 25;
              return (
                <li
                  key={f.name}
                  className="flex items-center gap-3 text-[12px]"
                >
                  <span className="w-32 font-mono text-[11px] text-[var(--color-fg-muted)]">
                    {f.name}
                  </span>
                  <span className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${Math.min(100, w * 100)}%` }}
                    />
                  </span>
                  <span className="w-12 tabular text-[11px] text-[var(--color-fg)] text-right">
                    {f.weight}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--color-fg-subtle)]">
            V3 (May 2026) drops the broken <code>dist_roads</code> feature
            and rebuilds the dataset with per-event 30-day pre-burn windows
            (NDVI/NDMI/LST measured strictly before the fire, with paired DOY
            sampling between burned and non-burned classes to remove
            seasonal leakage) and burnable-only land cover from ESA
            WorldCover. Headline AUC moved from 0.74 → 0.84.
          </p>
        </Card>
      </section>

      <section id="fwi" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">FWI computation</h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Implemented client-side in TypeScript following Van Wagner (1987)
          for the Canadian Forest Fire Weather Index System. Daily state
          (FFMC / DMC / DC) is persisted in Upstash KV and advanced once per
          day by an authenticated cron call. Forecast: Open-Meteo daily
          aggregates fed forward through the same equations.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GLOSSARY.filter((g) => g.category === "index").map((g) => (
            <Card
              key={g.id}
              variant="elevated"
              className="p-3"
              id={g.id}
            >
              <div className="flex items-baseline justify-between">
                <strong className="font-mono text-[12px]">{g.abbr}</strong>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                  {g.range}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
                {g.definition.en}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="performance" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          Performance & validation
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Reported on stratified random 5-fold cross-validation across 2929
          samples (May–Sep 2018-2022, ESA WorldCover burnable land only):
        </p>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="AUC-ROC" value="0.84" />
          <Stat label="Accuracy" value="79.0 %" />
          <Stat label="Kappa" value="0.48" />
          <Stat label="Precision" value="73.5 %" />
          <Stat label="Recall" value="53.7 %" />
          <Stat label="F1" value="0.62" />
          <Stat label="Train n" value="2 343" />
          <Stat label="Test n" value="586" />
        </ul>
        <p className="mt-3 text-[11.5px] text-[var(--color-fg-subtle)]">
          Honest disclosure: leave-one-year-out CV (train on 4 fire seasons,
          test on the 5th) lands at AUC ≈ 0.66. The 0.84 above is the
          apples-to-apples successor to V1's 0.74 (same metric); the 0.66 is
          the harder cross-year transfer score. Random Forest probabilities
          are also poorly calibrated by default — treat the score as a
          relative ranking signal, not an absolute probability.
        </p>
      </section>

      <section id="limitations" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          Known limitations
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] text-[var(--color-fg-muted)] list-disc pl-5">
          <li>
            Cloud cover gaps in Sentinel-2 NDVI/NDMI — Galicia averages 60 %
            cloudy days; weekly composites can lag during winter.
          </li>
          <li>
            FIRMS active-fire detection floor is ~1 km² (MODIS) / ~375 m²
            (VIIRS). Small understory fires may go undetected until they
            crown.
          </li>
          <li>
            FWI assumes uniform fuel and flat terrain; local effects (canyon
            funnelling, fuel breaks, recent burns) are not modelled.
          </li>
          <li>
            Risk score is fitted to 2018–2022 fire seasons; climate
            non-stationarity may degrade out-of-distribution performance.
          </li>
          <li>
            <code>dist_roads</code> feature is currently a constant — see ML
            model section.
          </li>
        </ul>
      </section>

      <section id="version" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          Version & reproducibility
        </h2>
        <Card variant="elevated" className="mt-3 p-4 text-[12.5px] font-mono">
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-[var(--color-fg-subtle)]">Schema</span>
            <span>v1</span>
            <span className="text-[var(--color-fg-subtle)]">Model</span>
            <span>fire_risk_rf v3 · 200 trees</span>
            <span className="text-[var(--color-fg-subtle)]">
              Training period
            </span>
            <span>2018 – 2022 fire seasons (May–Sep)</span>
            <span className="text-[var(--color-fg-subtle)]">Random seed</span>
            <span>42</span>
            <span className="text-[var(--color-fg-subtle)]">
              Repository
            </span>
            <a
              className="text-[var(--color-accent)] hover:underline"
              href="https://github.com/pablo-munoz/perspectives-on-ai-and-sustainability"
            >
              github.com/pablo-munoz/perspectives-on-ai-and-sustainability
            </a>
          </div>
        </Card>
      </section>

      <section id="citation" className="mb-8 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">Citation</h2>
        <pre className="mt-3 p-4 rounded-md border border-[var(--color-border)] bg-black/40 text-[11.5px] overflow-x-auto whitespace-pre">
{`@misc{firesee2026,
  author       = {Mu\\u{n}oz, Pablo},
  title        = {Fire-See — Wildfire risk dashboard for Ourense, Galicia},
  year         = {2026},
  howpublished = {\\url{https://perspectives-on-ai-and-sustainabili.vercel.app}},
  note         = {Data sources: AEMET, NASA FIRMS, Open-Meteo, Copernicus EFFIS}
}`}
        </pre>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="mt-1 font-display text-base font-bold tabular">
        {value}
      </div>
    </li>
  );
}
