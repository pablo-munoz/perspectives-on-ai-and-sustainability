import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

const LAT = 42.34;
const LNG = -7.86;
const CACHE_KEY = "air:cache:ourense";
const CACHE_TTL_S = 30 * 60;

interface AirResponse {
  fetchedAt: string;
  current: {
    pm2_5: number | null;
    pm10: number | null;
    europeanAqi: number | null;
    europeanAqiClass: string;
    co: number | null;
    o3: number | null;
    no2: number | null;
  };
  forecast: Array<{
    ts: string;
    pm2_5: number | null;
    pm10: number | null;
    europeanAqi: number | null;
  }>;
  source: string;
}

interface OpenMeteoAir {
  current: {
    time: string;
    pm2_5: number | null;
    pm10: number | null;
    european_aqi: number | null;
    carbon_monoxide: number | null;
    ozone: number | null;
    nitrogen_dioxide: number | null;
  };
  hourly: {
    time: string[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
    european_aqi: (number | null)[];
  };
}

function classifyEuropeanAqi(v: number | null): string {
  if (v == null) return "—";
  if (v <= 20) return "Good";
  if (v <= 40) return "Fair";
  if (v <= 60) return "Moderate";
  if (v <= 80) return "Poor";
  if (v <= 100) return "Very Poor";
  return "Extremely Poor";
}

export async function GET() {
  const store = kv();
  const cached = await store.get<AirResponse>(CACHE_KEY);
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL_S * 1000) return NextResponse.json(cached);
  }

  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set(
    "current",
    "pm2_5,pm10,european_aqi,carbon_monoxide,ozone,nitrogen_dioxide"
  );
  url.searchParams.set("hourly", "pm2_5,pm10,european_aqi");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "Europe/Madrid");

  let data: OpenMeteoAir;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch (err) {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      { error: "Air quality unavailable", reason: String(err) },
      { status: 503 }
    );
  }

  const response: AirResponse = {
    fetchedAt: new Date().toISOString(),
    current: {
      pm2_5: data.current?.pm2_5 ?? null,
      pm10: data.current?.pm10 ?? null,
      europeanAqi: data.current?.european_aqi ?? null,
      europeanAqiClass: classifyEuropeanAqi(data.current?.european_aqi ?? null),
      co: data.current?.carbon_monoxide ?? null,
      o3: data.current?.ozone ?? null,
      no2: data.current?.nitrogen_dioxide ?? null,
    },
    forecast: (data.hourly?.time ?? []).map((ts, i) => ({
      ts,
      pm2_5: data.hourly.pm2_5[i] ?? null,
      pm10: data.hourly.pm10[i] ?? null,
      europeanAqi: data.hourly.european_aqi[i] ?? null,
    })),
    source: "Open-Meteo Air Quality · CAMS-derived",
  };

  await store.set(CACHE_KEY, response, { ex: CACHE_TTL_S });
  return NextResponse.json(response);
}
