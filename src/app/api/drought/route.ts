import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { classifyKBDI, DEFAULT_KBDI_STATE, nextKBDI } from "@/lib/kbdi";

export const revalidate = 0;

const LAT = 42.34;
const LNG = -7.86;
const CACHE_KEY = "drought:cache:ourense";
const CACHE_TTL_S = 60 * 60;

interface OpenMeteoArchive {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

interface DroughtResponse {
  fetchedAt: string;
  kbdi: {
    current: number;
    classification: { label: string; tone: string };
    series: Array<{ date: string; value: number }>;
  };
  spi30: number | null;
  spi90: number | null;
  daysSinceRain: number;
  totalPrecip30d: number;
  totalPrecip90d: number;
  source: string;
}

async function fetchArchive(days: number): Promise<OpenMeteoArchive | null> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set("start_date", fmt(start));
  url.searchParams.set("end_date", fmt(end));
  url.searchParams.set("daily", "temperature_2m_max,precipitation_sum");
  url.searchParams.set("timezone", "Europe/Madrid");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function computeSPI(precip: number[], windowDays: number): number | null {
  // Simplified SPI: z-score of summed precipitation vs a 5-year sliding mean.
  // We don't have multi-year archive locally so we approximate: use the
  // window's own mean/std as a baseline (negative = drier than its own
  // recent average).
  if (precip.length < windowDays) return null;
  const sum = precip.slice(-windowDays).reduce((a, b) => a + b, 0);
  const mean =
    precip.reduce((a, b) => a + b, 0) / precip.length / windowDays *
    windowDays;
  const std = Math.sqrt(
    precip.reduce((a, b) => a + (b - mean / windowDays) ** 2, 0) /
      precip.length
  );
  const expectedSum = mean;
  if (std === 0) return 0;
  return Number(((sum - expectedSum) / (std * Math.sqrt(windowDays))).toFixed(2));
}

export async function GET() {
  const store = kv();
  const cached = await store.get<DroughtResponse>(CACHE_KEY);
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL_S * 1000) return NextResponse.json(cached);
  }

  const archive = await fetchArchive(120);
  if (!archive) {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      { error: "Open-Meteo archive unavailable" },
      { status: 503 }
    );
  }

  const days = archive.daily.time;
  const tmax = archive.daily.temperature_2m_max;
  const precip = archive.daily.precipitation_sum;

  let state = DEFAULT_KBDI_STATE;
  const series: Array<{ date: string; value: number }> = [];
  for (let i = 0; i < days.length; i++) {
    const T = tmax[i];
    const R = precip[i];
    if (T == null || R == null) continue;
    state = nextKBDI(state, { tempCmax: T, rainMm: R });
    series.push({ date: days[i], value: Math.round(state.q) });
  }

  const last90 = precip.slice(-90).map((v) => v ?? 0);
  const last30 = precip.slice(-30).map((v) => v ?? 0);

  let daysSinceRain = 0;
  for (let i = precip.length - 1; i >= 0; i--) {
    if ((precip[i] ?? 0) >= 1) break;
    daysSinceRain++;
  }

  const cls = classifyKBDI(state.q);

  const response: DroughtResponse = {
    fetchedAt: new Date().toISOString(),
    kbdi: {
      current: Math.round(state.q),
      classification: cls,
      series: series.slice(-90),
    },
    spi30: computeSPI(last30, 30),
    spi90: computeSPI(last90, 90),
    daysSinceRain,
    totalPrecip30d: Math.round(last30.reduce((a, b) => a + b, 0)),
    totalPrecip90d: Math.round(last90.reduce((a, b) => a + b, 0)),
    source: "Open-Meteo Archive · ERA5",
  };

  await store.set(CACHE_KEY, response, { ex: CACHE_TTL_S });
  return NextResponse.json(response);
}
