import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import {
  advanceDay,
  DEFAULT_STATE,
  FwiDay,
  FwiOutput,
  FwiResponse,
  FwiState,
} from "@/lib/fwi";

const STATE_KEY = "fwi:state:ourense";
const RESPONSE_KEY = "fwi:cache:ourense";
const RESPONSE_TTL_S = 60 * 60; // 1 h

const LAT = 42.34;
const LNG = -7.86;

interface OpenMeteoDaily {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    relative_humidity_2m_min: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

async function fetchOpenMeteo(): Promise<OpenMeteoDaily> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum"
  );
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

function pack(date: string, out: FwiOutput): FwiDay {
  return {
    date,
    ffmc: round(out.ffmc),
    dmc: round(out.dmc),
    dc: round(out.dc),
    isi: round(out.isi),
    bui: round(out.bui),
    fwi: round(out.fwi),
    fwiClass: out.fwiClass,
  };
}

function round(x: number) {
  return Math.round(x * 10) / 10;
}

export const revalidate = 0;

export async function GET() {
  const store = kv();
  const cached = await store.get<FwiResponse>(RESPONSE_KEY);
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < RESPONSE_TTL_S * 1000) return NextResponse.json(cached);
  }

  let data: OpenMeteoDaily;
  try {
    data = await fetchOpenMeteo();
  } catch (err) {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      { error: "FWI data unavailable", reason: String(err) },
      { status: 503 }
    );
  }

  const persisted = await store.get<FwiState>(STATE_KEY);
  let state: FwiState = persisted ?? DEFAULT_STATE;

  const days = data.daily.time;
  const out: FwiDay[] = [];
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const T = data.daily.temperature_2m_max[i];
    const H = data.daily.relative_humidity_2m_min[i];
    const W = data.daily.wind_speed_10m_max[i];
    const P = data.daily.precipitation_sum[i];

    if (T == null || H == null || W == null || P == null) continue;

    const month = new Date(date + "T12:00:00Z").getUTCMonth();
    const next = advanceDay(state, {
      tempC: T,
      humidityPct: H,
      windKph: W,
      precipMm: P,
      month,
    });
    out.push(pack(date, next));
    state = { ffmc: next.ffmc, dmc: next.dmc, dc: next.dc };

    // Persist state at the END of "today" so the next day's run starts here.
    if (i === 0) {
      await store.set(
        STATE_KEY,
        { ffmc: next.ffmc, dmc: next.dmc, dc: next.dc },
        { ex: 7 * 24 * 3600 }
      );
    }
  }

  if (out.length === 0) {
    return NextResponse.json(
      { error: "FWI data incomplete from Open-Meteo" },
      { status: 503 }
    );
  }

  const response: FwiResponse = {
    current: out[0],
    forecast: out,
    source: "Van Wagner FWI · Open-Meteo daily forecast",
    fetchedAt: new Date().toISOString(),
  };

  await store.set(RESPONSE_KEY, response, { ex: RESPONSE_TTL_S });
  return NextResponse.json(response);
}

