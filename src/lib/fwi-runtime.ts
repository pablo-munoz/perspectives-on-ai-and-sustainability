import { kv } from "./kv";
import {
  advanceDay,
  DEFAULT_STATE,
  type FwiDay,
  type FwiOutput,
  type FwiResponse,
  type FwiState,
} from "./fwi";

export const FWI_STATE_KEY = "fwi:state:ourense";
export const FWI_RESPONSE_KEY = "fwi:cache:ourense";
export const FWI_RESPONSE_TTL_S = 60 * 60;

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
  const round = (x: number) => Math.round(x * 10) / 10;
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

export async function getCachedFwi(): Promise<FwiResponse | null> {
  const store = kv();
  const cached = await store.get<FwiResponse>(FWI_RESPONSE_KEY);
  if (!cached) return null;
  const age = Date.now() - new Date(cached.fetchedAt).getTime();
  if (age >= FWI_RESPONSE_TTL_S * 1000) return null;
  return cached;
}

export async function refreshFwi(): Promise<FwiResponse> {
  const store = kv();
  const data = await fetchOpenMeteo();
  const persisted = await store.get<FwiState>(FWI_STATE_KEY);
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

    if (i === 0) {
      await store.set(
        FWI_STATE_KEY,
        { ffmc: next.ffmc, dmc: next.dmc, dc: next.dc },
        { ex: 7 * 24 * 3600 }
      );
    }
  }

  if (out.length === 0) {
    throw new Error("FWI data incomplete from Open-Meteo");
  }

  const response: FwiResponse = {
    current: out[0],
    forecast: out,
    source: "Van Wagner FWI · Open-Meteo daily forecast",
    fetchedAt: new Date().toISOString(),
  };
  await store.set(FWI_RESPONSE_KEY, response, { ex: FWI_RESPONSE_TTL_S });
  return response;
}
