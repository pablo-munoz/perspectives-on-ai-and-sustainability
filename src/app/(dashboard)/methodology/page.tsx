import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Fire-See",
  description:
    "Data sources, model card and known limitations of Fire-See's wildfire risk dashboard.",
};

const SECTIONS = [
  { id: "overview", title: "What this dashboard is (and isn't)" },
  { id: "sources", title: "Where the data comes from" },
  { id: "model", title: "How the risk score is calculated" },
  { id: "fwi", title: "The FWI weather index" },
  { id: "performance", title: "How well does it work?" },
  { id: "limitations", title: "What it can't see" },
  { id: "version", title: "Version & reproducibility" },
  { id: "citation", title: "Citation" },
];

const SOURCES = [
  {
    name: "AEMET Open Data",
    purpose: "Live weather from the Spanish meteorological agency — temperature, humidity, wind, rain. Station 1690A in Ourense.",
    refresh: "every 5 min",
    license: "CC-BY 4.0",
  },
  {
    name: "NASA FIRMS · VIIRS 375 m",
    purpose: "Where on Earth a satellite has just spotted heat hot enough to be a fire.",
    refresh: "every 10 min",
    license: "Public domain",
  },
  {
    name: "Open-Meteo Forecast",
    purpose: "Tomorrow's weather (temperature, humidity, wind, rain) for the next 7 days, used to project the FWI ahead.",
    refresh: "every hour",
    license: "CC-BY 4.0",
  },
  {
    name: "Copernicus EFFIS",
    purpose: "The European Union's official fire-danger map. We show it as an optional toggleable layer.",
    refresh: "daily",
    license: "© European Union, Copernicus",
  },
  {
    name: "NASA GIBS",
    purpose: "Satellite imagery (MODIS true-color) you can switch on as a map background.",
    refresh: "daily",
    license: "Public domain",
  },
  {
    name: "OpenStreetMap · Overpass",
    purpose: "Where the nearest fire stations, hospitals and water points are when you click a hotspot.",
    refresh: "on demand",
    license: "ODbL · © OSM contributors",
  },
  {
    name: "OpenRouteService",
    purpose: "Drive-time circles (10 / 15 minutes from a hotspot) using the road network.",
    refresh: "on demand",
    license: "© HeiGIT",
  },
  {
    name: "Copernicus Sentinel-2",
    purpose: "Vegetation health (NDVI) and moisture (NDMI) per zone, refreshed once a week.",
    refresh: "weekly",
    license: "Modified Copernicus Sentinel data",
  },
  {
    name: "MITECO · EGIF",
    purpose: "Spain's official archive of past forest fires — used for context, not real-time.",
    refresh: "annual",
    license: "© MITECO",
  },
];

const FEATURES = [
  {
    name: "elevation",
    weight: "19.8 %",
    plain: "How high above sea level the patch sits",
  },
  {
    name: "LST",
    weight: "18.1 %",
    plain: "How hot the ground surface is",
  },
  {
    name: "dist_urban",
    weight: "16.4 %",
    plain: "How far the patch is from the nearest village or town",
  },
  {
    name: "slope",
    weight: "12.4 %",
    plain: "How steep the terrain is",
  },
  {
    name: "NDMI",
    weight: "11.9 %",
    plain: "How wet the vegetation is (moisture index)",
  },
  {
    name: "NDVI",
    weight: "11.9 %",
    plain: "How green and healthy the vegetation looks",
  },
  {
    name: "aspect",
    weight: "9.5 %",
    plain: "Which way the slope faces (south-facing dries faster)",
  },
];

interface IndexCard {
  abbr: string;
  range: string;
  plain: string;
}

const FWI_INDICES: IndexCard[] = [
  {
    abbr: "FWI",
    range: "0 → 50+",
    plain:
      "The headline number. How easy is it for a fire to spread today, given the recent weather? Below 5 is calm, 21+ is high, 50+ is extreme.",
  },
  {
    abbr: "FFMC",
    range: "0 → 101",
    plain:
      "How dry the small stuff is — leaves, twigs, dry grass. Updates within hours of a weather change. Above 85 = a spark catches very easily.",
  },
  {
    abbr: "DMC",
    range: "0 → 150+",
    plain:
      "Moisture in the half-rotted leaves on the forest floor. Reacts on a weekly scale.",
  },
  {
    abbr: "DC",
    range: "0 → 800+",
    plain:
      "Moisture deep in the soil. Slow to respond — tracks long-term drought through the whole season.",
  },
  {
    abbr: "ISI",
    range: "0 → 50+",
    plain:
      "Combines wind speed with how dry the surface fuel is. Predicts how fast a fire would start spreading.",
  },
  {
    abbr: "BUI",
    range: "0 → 200+",
    plain:
      "How much fuel is actually available to feed a fire if one starts.",
  },
  {
    abbr: "KBDI",
    range: "0 → 800",
    plain:
      "A drought index that resets after the wet season and grows on every rain-free day.",
  },
  {
    abbr: "SPI",
    range: "−3 → +3",
    plain:
      "Compares this period's rain to what's normal for this time of year. Negative = unusually dry, positive = unusually wet.",
  },
];

const LIMITATIONS = [
  {
    title: "Clouds hide vegetation",
    body: "Galicia is cloudy ~60% of the year. When clouds block the satellite, our weekly NDVI / NDMI refresh skips those pixels and falls behind, especially in winter.",
  },
  {
    title: "Tiny fires are invisible",
    body: "Satellites only spot fires bigger than roughly a tennis-court (375 m × 375 m for VIIRS, 1 km × 1 km for MODIS). A small understory fire stays hidden until it reaches the treetops.",
  },
  {
    title: "FWI is a regional average",
    body: "The Fire Weather Index gives one number for a whole region — it doesn't know that a particular canyon funnels wind, or that this strip was logged last year. Local quirks aren't captured.",
  },
  {
    title: "The model learned from 2018-2022",
    body: "Climate is shifting. Future fire seasons may not look like recent ones, so the score's accuracy can drift over time. We re-train periodically.",
  },
  {
    title: "Probabilities aren't calibrated",
    body: "A 'Risk 75%' from a Random Forest doesn't strictly mean 75 of 100 such days end in fire. Treat the number as a ranking — higher means more concerning, not a literal probability.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-8">
        <div className="section-label">Documentation</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Fire-See methodology
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose leading-relaxed">
          A plain-language tour of where the numbers on this dashboard come
          from, how we compute them, what the model can — and can&apos;t —
          tell you, and how to cite this work.
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

      <section id="overview" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          What this dashboard is (and isn&apos;t)
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Fire-See is an open dashboard that mixes free public datasets to
          estimate how fire-prone eight forest zones in Ourense, Galicia,
          look right now. Think of it as a research tool and a public
          information hub, not a 911 service.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          It is{" "}
          <strong className="text-[var(--color-fg)]">not</strong> a substitute
          for official emergency channels. For an active emergency, call{" "}
          <strong className="text-[var(--color-fg)]">112</strong> or check
          the Xunta Emerxencias portal.
        </p>
      </section>

      <section id="sources" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          Where the data comes from
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Everything you see is built from open feeds — Spanish weather,
          NASA satellites, Copernicus (the EU&apos;s Earth-observation
          program), and OpenStreetMap. No private data, no proprietary models.
        </p>
        <Card variant="elevated" className="mt-4 p-0 overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-white/[0.03]">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">What we use it for</th>
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2">License</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr
                  key={s.name}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-4 py-2 font-semibold align-top">
                    {s.name}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-fg-muted)] align-top leading-snug">
                    {s.purpose}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-fg-muted)] tabular align-top">
                    {s.refresh}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-fg-subtle)] text-[11px] align-top">
                    {s.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section id="model" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          How the risk score is calculated
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          The risk number for each zone (0 – 100%) comes from a
          machine-learning model called a{" "}
          <strong className="text-[var(--color-fg)]">Random Forest</strong>.
          Picture it as 200 small judges. Each judge looks at a handful of
          clues — how green the trees are, how dry the soil is, how steep
          the slope, how hot the ground — and votes &quot;risky&quot; or
          &quot;safe&quot;. The percentage of judges that voted
          &quot;risky&quot; is the final score.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          We taught the judges by showing them{" "}
          <strong className="text-[var(--color-fg)]">2,929 real examples</strong>{" "}
          from Galicia fire seasons 2018–2022. Half were patches that
          actually burned (NASA&apos;s satellite-derived burn map flagged
          them); the other half were similar-looking patches that
          didn&apos;t burn. The model learns what the burned patches had in
          common before they caught fire.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          A score of 75% doesn&apos;t mean &quot;75 out of 100 such days
          will end in fire&quot; — it means &quot;most of our judges think
          this looks like the kind of patch that has burned in the past&quot;.
          Treat it as a ranking, not a literal probability.
        </p>

        <Card variant="elevated" className="mt-4 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
              What the judges weigh
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              Importance %
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {FEATURES.map((f) => {
              const w = parseFloat(f.weight) / 25;
              return (
                <li
                  key={f.name}
                  className="flex items-center gap-3 text-[12px]"
                >
                  <span className="w-44 text-[12px] text-[var(--color-fg-muted)]">
                    <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] mr-1.5">
                      {f.name}
                    </span>
                    {f.plain}
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
        </Card>

        <p className="mt-4 text-[11.5px] text-[var(--color-fg-subtle)] leading-relaxed">
          For the curious: this is V3 (May 2026). Compared to V1 we drop a
          broken &quot;distance to roads&quot; feature that turned out to be
          a constant in our area, and we rebuild the dataset using
          per-event 30-day pre-burn windows so the vegetation snapshots are
          measured strictly before each fire. Headline AUC moved from{" "}
          <strong className="text-[var(--color-fg)]">0.74 → 0.84</strong>.
        </p>
      </section>

      <section id="fwi" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          The FWI weather index
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          The{" "}
          <strong className="text-[var(--color-fg)]">Fire Weather Index</strong>{" "}
          (FWI) is a single number from 0 to 50+ that summarizes how
          fire-ready the weather is. It was invented in Canada in 1987 and
          is now the EU standard — every official European fire warning
          you&apos;ve seen uses it.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Fire-See computes FWI in your browser, day by day, from the same
          equations the Canadian Forest Service published in 1987, fed with
          weather forecasts from Open-Meteo. Each component below answers a
          slightly different question.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FWI_INDICES.map((g) => (
            <Card
              key={g.abbr}
              variant="elevated"
              className="p-3"
              id={g.abbr.toLowerCase()}
            >
              <div className="flex items-baseline justify-between">
                <strong className="font-mono text-[12px]">{g.abbr}</strong>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                  {g.range}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-fg-muted)] leading-snug">
                {g.plain}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="performance" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          How well does it work?
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          We test the model with a standard procedure called{" "}
          <strong className="text-[var(--color-fg)]">cross-validation</strong>:
          hide a slice of the training examples, train on the rest, then
          ask the model to score the hidden slice and check how often it
          gets it right. Repeat five times with different slices and
          average.
        </p>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          The headline number is{" "}
          <strong className="text-[var(--color-fg)]">AUC = 0.84</strong>.
          What that means in plain words: pick one burned patch and one
          patch that didn&apos;t burn at random — the model gives the
          burned one a higher risk score 84 times out of 100. Pure chance
          would be 50/100; perfect would be 100/100.
        </p>

        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="AUC-ROC" value="0.84" />
          <Stat label="Accuracy" value="79 %" />
          <Stat label="Precision" value="74 %" />
          <Stat label="Recall" value="54 %" />
          <Stat label="F1" value="0.62" />
          <Stat label="Kappa" value="0.48" />
          <Stat label="Train n" value="2 343" />
          <Stat label="Test n" value="586" />
        </ul>

        <p className="mt-4 text-[12.5px] text-[var(--color-fg-muted)] leading-relaxed">
          <strong className="text-[var(--color-fg)]">A more honest test.</strong>{" "}
          Random cross-validation can be a bit forgiving because the train
          and test slices share the same fire seasons. A harder test —
          training on four full fire seasons and predicting a year the
          model has never seen — drops AUC to about 0.66. That gap is the
          gap between &quot;sees similar weather&quot; and &quot;sees a
          new climate.&quot; We report both.
        </p>
      </section>

      <section id="limitations" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          What it can&apos;t see
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          A model is only as good as what it can measure. Here are the
          biggest blind spots:
        </p>
        <ul className="mt-4 space-y-3">
          {LIMITATIONS.map((l) => (
            <li
              key={l.title}
              className="px-4 py-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="text-[13px] font-semibold text-[var(--color-fg)]">
                {l.title}
              </div>
              <p className="mt-1 text-[12.5px] text-[var(--color-fg-muted)] leading-snug">
                {l.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="version" className="mb-10 scroll-mt-6">
        <h2 className="font-display text-xl font-semibold">
          Version & reproducibility
        </h2>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          Everything you see is reproducible from the GitHub repo with one
          random seed. No proprietary code, no hidden weights.
        </p>
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
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
          If you reference Fire-See in an article, paper or report, this is
          the citation block.
        </p>
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
