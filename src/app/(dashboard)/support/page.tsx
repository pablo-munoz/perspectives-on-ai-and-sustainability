import { Card } from "@/components/ui/Card";
import { ExternalLink } from "lucide-react";

interface Source {
  name: string;
  purpose: string;
  url: string;
  attribution: string;
}

const SOURCES: Source[] = [
  {
    name: "AEMET Open Data",
    purpose: "Live weather observations and forecasts (station 1690A · Ourense).",
    url: "https://opendata.aemet.es/",
    attribution: "© Agencia Estatal de Meteorología (AEMET)",
  },
  {
    name: "NASA FIRMS · VIIRS 375 m",
    purpose: "Near-real-time active fire / thermal anomaly detections.",
    url: "https://firms.modaps.eosdis.nasa.gov/",
    attribution: "Data: NASA FIRMS / EOSDIS",
  },
  {
    name: "Open-Meteo · Forest Fire API",
    purpose: "FWI / FFMC / DMC / DC / ISI / BUI components from ECMWF and GFS.",
    url: "https://open-meteo.com/en/docs/forest-fire-api",
    attribution: "© Open-Meteo · CC-BY 4.0",
  },
  {
    name: "Copernicus EFFIS",
    purpose: "European Fire Weather Index forecast raster (overlay layer).",
    url: "https://effis.jrc.ec.europa.eu/",
    attribution: "© European Union, Copernicus EFFIS",
  },
  {
    name: "NASA GIBS",
    purpose: "VIIRS thermal anomalies tile layer for the map.",
    url: "https://gibs.earthdata.nasa.gov/",
    attribution: "Imagery: NASA Worldview / EOSDIS GIBS",
  },
  {
    name: "OpenStreetMap · Overpass API",
    purpose: "Nearby fire stations, hospitals, and water points context.",
    url: "https://overpass-api.de/",
    attribution: "© OpenStreetMap contributors · ODbL",
  },
  {
    name: "OpenRouteService",
    purpose: "Drive-time evacuation isochrones from active hotspots.",
    url: "https://openrouteservice.org/",
    attribution: "© openrouteservice.org by HeiGIT",
  },
  {
    name: "Copernicus Sentinel-2 / GEE",
    purpose: "NDVI and NDMI per zone, refreshed weekly.",
    url: "https://dataspace.copernicus.eu/",
    attribution: "Contains modified Copernicus Sentinel data",
  },
  {
    name: "MITECO · EGIF",
    purpose: "Historical fire perimeters and ignition statistics for Galicia.",
    url: "https://www.miteco.gob.es/es/biodiversidad/estadisticas/",
    attribution: "© Ministerio para la Transición Ecológica",
  },
];

export default function SupportPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <div className="section-label">About</div>
        <h1 className="mt-2 font-display text-2xl font-bold">
          Fire-See — Data sources & methodology
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)] max-w-2xl">
          Fire-See aggregates open-data feeds and runs a Random Forest model
          trained on Sentinel-2 vegetation indices and historical MODIS burned
          areas (2015–2023) for eight forest zones in Ourense, Galicia.
        </p>
      </div>

      <Card variant="elevated" className="p-6">
        <div className="section-label">Data sources</div>
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {SOURCES.map((s) => (
            <li key={s.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-fg)]">
                    {s.name}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-fg-muted)] leading-snug">
                    {s.purpose}
                  </p>
                  <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                    {s.attribution}
                  </p>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 mt-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors"
                  aria-label={`${s.name} website`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="elevated" className="p-6 mt-5">
        <div className="section-label">Disclaimer</div>
        <p className="mt-3 text-[12.5px] text-[var(--color-fg-muted)] leading-relaxed">
          Fire-See is an experimental decision-support tool and is{" "}
          <strong className="text-[var(--color-fg)]">not</strong> a substitute
          for official emergency channels. For active emergencies in Galicia,
          contact <strong className="text-[var(--color-fg)]">112</strong> or
          consult the{" "}
          <a
            href="https://emerxencias.xunta.gal/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--color-accent)] hover:underline"
          >
            Xunta Emerxencias
          </a>{" "}
          portal.
        </p>
      </Card>
    </div>
  );
}
