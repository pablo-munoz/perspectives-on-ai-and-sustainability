import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import historicalFires from "@/lib/ml/historical-fires.json";

interface YearByZone {
  name: string;
  by_year: Record<string, number>;
}

interface HistoricalDoc {
  zones: Record<string, YearByZone>;
  training_period: string;
}

const HIST = historicalFires as unknown as HistoricalDoc;

interface AemetHourly {
  value: string;
  periodo: string;
}

interface AemetForecastDay {
  fecha: string;
  temperatura?: AemetHourly[];
  humedadRelativa?: AemetHourly[];
  vientoAndRachaMax?: Array<{ velocidad?: string[]; periodo: string }>;
  probPrecipitacion?: AemetHourly[];
}

/**
 * 5-year baseline: fraction of zones that burned at least once during the
 * recent reference period (last 5 years of the training window).
 *
 * historical-fires.json contains burned-pixel counts per zone per year for the
 * full training period (2015-2024). We pick the most recent 5 years and call a
 * zone "burned" if its count ≥ a small threshold (3 pixels at 500 m scale ≈
 * 0.75 km²). The baseline is then % of zones with a burn event.
 */
function fiveYearBaseline(): number {
  const zones = Object.values(HIST.zones);
  if (zones.length === 0) return 0;
  const allYears = new Set<number>();
  zones.forEach((z) =>
    Object.keys(z.by_year).forEach((y) => allYears.add(Number(y)))
  );
  const sorted = [...allYears].sort((a, b) => b - a).slice(0, 5);
  const burned = zones.filter((z) =>
    sorted.some((y) => (z.by_year[String(y)] ?? 0) >= 3)
  ).length;
  return burned / zones.length;
}

interface HistoryEntry {
  ts: string;
  avg: number;
  peak: { score: number };
}

async function currentSeasonalAverage(): Promise<number | null> {
  const store = kv();
  const recent = await store.recent<HistoryEntry>("risk:history", 4320);
  if (recent.length === 0) return null;
  const cutoff = Date.now() - 30 * 24 * 3600_000;
  const inWindow = recent.filter((s) => new Date(s.ts).getTime() >= cutoff);
  if (inWindow.length === 0) return null;
  const peakAvg =
    inWindow.reduce((s, r) => s + r.peak.score, 0) / inWindow.length;
  return peakAvg;
}

async function fetchAemet48hPeak(): Promise<{
  peak: number | null;
  source: string;
} | null> {
  const key = process.env.AEMET_API_KEY;
  if (!key) return { peak: null, source: "AEMET key missing" };
  try {
    const meta = await fetch(
      "https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/32054",
      { headers: { api_key: key }, cache: "no-store" }
    ).then((r) => r.json());
    if (meta?.estado !== 200 || !meta?.datos) {
      return { peak: null, source: `AEMET ${meta?.estado}` };
    }
    const forecast = await fetch(meta.datos, { cache: "no-store" }).then((r) =>
      r.json()
    );
    const day0 = forecast?.[0]?.prediccion?.dia?.[0] as
      | AemetForecastDay
      | undefined;
    const day1 = forecast?.[0]?.prediccion?.dia?.[1] as
      | AemetForecastDay
      | undefined;
    if (!day0 || !day1) return { peak: null, source: "AEMET no data" };

    const allTemps = [
      ...(day0.temperatura ?? []),
      ...(day1.temperatura ?? []),
    ].map((d) => Number(d.value));
    const allHum = [
      ...(day0.humedadRelativa ?? []),
      ...(day1.humedadRelativa ?? []),
    ].map((d) => Number(d.value));

    if (allTemps.length === 0) return { peak: null, source: "AEMET empty" };

    let peak = 0;
    for (let i = 0; i < allTemps.length; i++) {
      const t = allTemps[i];
      const h = allHum[i] ?? null;
      const zones = await computeDynamicRiskLive(
        {
          temperature: Number.isFinite(t) ? t : null,
          humidity: h,
          windSpeed: null,
          precipitation: 0,
        },
        []
      );
      const top = zones[0]?.dynamicScore ?? 0;
      if (top > peak) peak = top;
    }
    return { peak, source: "AEMET +48h municipal forecast" };
  } catch (err) {
    console.error("[forecast] AEMET fetch failed:", err);
    return { peak: null, source: "AEMET error" };
  }
}

export async function GET() {
  const [seasonal, forecast] = await Promise.all([
    currentSeasonalAverage(),
    fetchAemet48hPeak(),
  ]);

  return NextResponse.json({
    fiveYearBaseline: {
      value: fiveYearBaseline(),
      source: `MODIS MCD64A1 ${HIST.training_period} (last 5 years)`,
    },
    currentSeasonal: {
      value: seasonal,
      source: "Risk peak averaged over last 30 days (KV history)",
    },
    predicted48h: {
      value: forecast?.peak ?? null,
      source: forecast?.source ?? "n/a",
    },
    timestamp: new Date().toISOString(),
  });
}
