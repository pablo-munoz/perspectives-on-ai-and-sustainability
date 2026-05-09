import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import {
  advanceDay,
  classifyFWI,
  DEFAULT_STATE,
  type FwiState,
} from "@/lib/fwi";

const LAT = 42.34;
const LNG = -7.86;
const CACHE_KEY = "yoy:cache:ourense";
const CACHE_TTL_S = 24 * 60 * 60; // 1 day

interface YoyPoint {
  year: number;
  fwi: number;
  fwiClass: string;
  tmax: number | null;
  rh: number | null;
  precip: number | null;
}

interface YoyResponse {
  fetchedAt: string;
  date: string;
  points: YoyPoint[];
  source: string;
}

interface OpenMeteoArchive {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    relative_humidity_2m_min: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

async function fetchYearWindow(
  year: number,
  centerDate: string
): Promise<OpenMeteoArchive | null> {
  // Spin FWI from 30 days before center to get a stabilised state.
  const center = new Date(centerDate + "T12:00:00Z");
  center.setUTCFullYear(year);
  const start = new Date(center.getTime() - 30 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set("start_date", fmt(start));
  url.searchParams.set("end_date", fmt(center));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum"
  );
  url.searchParams.set("timezone", "Europe/Madrid");
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function spinUpFwi(arc: OpenMeteoArchive): YoyPoint | null {
  const days = arc.daily.time;
  if (days.length === 0) return null;
  let state: FwiState = DEFAULT_STATE;
  let lastIdx = -1;
  for (let i = 0; i < days.length; i++) {
    const T = arc.daily.temperature_2m_max[i];
    const H = arc.daily.relative_humidity_2m_min[i];
    const W = arc.daily.wind_speed_10m_max[i];
    const P = arc.daily.precipitation_sum[i];
    if (T == null || H == null || W == null || P == null) continue;
    const month = new Date(days[i] + "T12:00:00Z").getUTCMonth();
    const next = advanceDay(state, {
      tempC: T,
      humidityPct: H,
      windKph: W,
      precipMm: P,
      month,
    });
    state = { ffmc: next.ffmc, dmc: next.dmc, dc: next.dc };
    if (i === days.length - 1) {
      return {
        year: new Date(days[i]).getUTCFullYear(),
        fwi: Math.round(next.fwi * 10) / 10,
        fwiClass: classifyFWI(next.fwi),
        tmax: T,
        rh: H,
        precip: P,
      };
    }
    lastIdx = i;
  }
  if (lastIdx === -1) return null;
  return null;
}

export async function GET() {
  const store = kv();
  const cached = await store.get<YoyResponse>(CACHE_KEY);
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL_S * 1000) return NextResponse.json(cached);
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisYear = new Date().getUTCFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 4];

  const archives = await Promise.all(
    years.map((y) => fetchYearWindow(y, today))
  );
  const points = archives
    .map((arc) => (arc ? spinUpFwi(arc) : null))
    .filter((p): p is YoyPoint => p != null);

  const response: YoyResponse = {
    fetchedAt: new Date().toISOString(),
    date: today,
    points,
    source: "Open-Meteo Archive · ERA5",
  };

  await store.set(CACHE_KEY, response, { ex: CACHE_TTL_S });
  return NextResponse.json(response);
}
