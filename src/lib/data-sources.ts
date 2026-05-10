/**
 * Shared data-source functions used by API routes.
 * Centralising here avoids cross-route fetch caching that
 * can lock in cold-start failure responses.
 */

const STATION_ID = "1690A";
const OURENSE_BBOX = "-8.5,41.8,-7.0,42.5";
const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
const FIRMS_DAYS = "2";

export interface LiveWeather {
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  precipitation: number | null;
  pressure?: number | null;
  lastUpdated: string;
  source: string;
  station?: string;
  error?: string;
}

export interface LiveHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  confidenceLabel: string;
  satellite: string;
  timestamp: string;
}

export interface FirmsData {
  hotspots: LiveHotspot[];
  source: string;
  count: number;
  note?: string;
  error?: string;
  fetchedAt: string;
}

function degreesToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function parseConfidence(raw: string): { value: number; label: string } {
  const trimmed = (raw || "").trim().toLowerCase();
  if (!trimmed) return { value: 50, label: "nominal" };
  const num = parseFloat(trimmed);
  if (!Number.isNaN(num) && num >= 0 && num <= 100) {
    const label = num >= 80 ? "high" : num >= 30 ? "nominal" : "low";
    return { value: num, label };
  }
  if (trimmed.startsWith("h")) return { value: 90, label: "high" };
  if (trimmed.startsWith("n")) return { value: 60, label: "nominal" };
  if (trimmed.startsWith("l")) return { value: 30, label: "low" };
  return { value: 50, label: "nominal" };
}

const WEATHER_CACHE_KEY = "weather:cache";
const WEATHER_SOFT_TTL_MS = 5 * 60 * 1000;

/**
 * Wrapper around `fetchWeather` that caches successful responses in Upstash KV
 * and serves stale data when AEMET is rate-limited (429) or otherwise down.
 *
 * Why not `unstable_cache`: it caches *every* return value including the
 * `source: "Unavailable"` failure object, freezing the dashboard for the full
 * TTL when AEMET 429s. KV-backed cache lets us only persist successes.
 */
export async function fetchWeatherCached(): Promise<LiveWeather> {
  const { kv } = await import("./kv");
  const store = kv();
  const cached = await store.get<LiveWeather>(WEATHER_CACHE_KEY);

  if (cached && cached.lastUpdated) {
    const age = Date.now() - new Date(cached.lastUpdated).getTime();
    if (age < WEATHER_SOFT_TTL_MS) return cached;
  }

  const fresh = await fetchWeather();
  if (fresh.source !== "Unavailable") {
    await store.set(WEATHER_CACHE_KEY, fresh, { ex: 3600 });
    return fresh;
  }

  return cached ?? fresh;
}

export async function fetchWeather(): Promise<LiveWeather> {
  const key = process.env.AEMET_API_KEY;
  const lastUpdated = new Date().toISOString();

  if (!key) {
    return {
      temperature: null,
      humidity: null,
      windSpeed: null,
      windDirection: null,
      precipitation: null,
      lastUpdated,
      source: "Unavailable",
      error: "AEMET_API_KEY not set",
    };
  }

  // Strict timeout — AEMET intermittently times out at the TLS layer; a stale
  // KV cache served by the wrapper is far better UX than a 6 s hang.
  const aemetFetch = (input: string, init: RequestInit = {}) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(4000) });

  // AEMET returns metadata as application/json but the actual `datos` blob as
  // text/plain;charset=ISO-8859-15 even though the body is valid JSON. We
  // can't gate on Content-Type alone — instead read text and try to parse,
  // rejecting only if the body is clearly not JSON (e.g. an HTML error page).
  const safeJson = async (res: Response) => {
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("<")) {
      throw new Error(`non-JSON body (${res.status})`);
    }
    return JSON.parse(trimmed);
  };

  try {
    const metaRes = await aemetFetch(
      `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${STATION_ID}`,
      { headers: { api_key: key }, cache: "no-store" }
    );
    const meta = await safeJson(metaRes);

    if (meta?.estado === 200 && meta?.datos) {
      const dataRes = await aemetFetch(meta.datos, { cache: "no-store" });
      const obs = await safeJson(dataRes);
      if (Array.isArray(obs) && obs.length > 0) {
        const latest = obs[obs.length - 1];
        return {
          temperature: latest.ta ?? latest.tamin ?? null,
          humidity: latest.hr ?? null,
          windSpeed: latest.vv ? Math.round(latest.vv * 3.6) : null,
          windDirection: latest.dv ? degreesToDirection(latest.dv) : null,
          precipitation: latest.prec ?? 0,
          pressure: latest.pres ?? null,
          lastUpdated: latest.fint || lastUpdated,
          source: "AEMET Observation",
          station: STATION_ID,
        };
      }
    }

    // Forecast fallback
    const fMeta = await aemetFetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/32054`,
      { headers: { api_key: key }, cache: "no-store" }
    );
    const fJson = await safeJson(fMeta);
    if (fJson?.estado === 200 && fJson?.datos) {
      const dataRes = await aemetFetch(fJson.datos, { cache: "no-store" });
      const forecast = await safeJson(dataRes);
      const today = forecast?.[0]?.prediccion?.dia?.[0];
      if (today) {
        return {
          temperature: today.temperatura?.maxima ?? null,
          humidity: today.humedadRelativa?.minima ?? null,
          windSpeed: null,
          windDirection: null,
          precipitation: today.probPrecipitacion?.[0]?.value ?? 0,
          lastUpdated: forecast[0].elaborado || lastUpdated,
          source: "AEMET Forecast",
          station: "Ourense (32054)",
        };
      }
    }
  } catch (err) {
    console.error("AEMET fetch error:", err);
  }

  return {
    temperature: null,
    humidity: null,
    windSpeed: null,
    windDirection: null,
    precipitation: null,
    lastUpdated,
    source: "Unavailable",
    error: "Could not fetch AEMET data",
  };
}

export async function fetchFirms(): Promise<FirmsData> {
  const key = process.env.FIRMS_MAP_KEY;
  const fetchedAt = new Date().toISOString();

  if (!key) {
    return {
      hotspots: [],
      source: "Unavailable",
      count: 0,
      error: "FIRMS_MAP_KEY not set",
      fetchedAt,
    };
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${FIRMS_SOURCE}/${OURENSE_BBOX}/${FIRMS_DAYS}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok || text.includes("Error") || text.includes("Invalid")) {
      return {
        hotspots: [],
        source: "FIRMS",
        count: 0,
        note: "No active fires detected in Ourense area",
        fetchedAt,
      };
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      return { hotspots: [], source: "FIRMS", count: 0, fetchedAt };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const latIdx = headers.indexOf("latitude");
    const lngIdx = headers.indexOf("longitude");
    const brightIdx = headers.indexOf("bright_ti4");
    const confIdx = headers.indexOf("confidence");
    const dateIdx = headers.indexOf("acq_date");
    const timeIdx = headers.indexOf("acq_time");
    const satIdx = headers.indexOf("satellite");

    const hotspots = lines
      .slice(1)
      .map((line, i) => {
        const cols = line.split(",");
        const conf = parseConfidence(cols[confIdx] ?? "");
        return {
          id: `firms-${i}`,
          lat: parseFloat(cols[latIdx]),
          lng: parseFloat(cols[lngIdx]),
          brightness: parseFloat(cols[brightIdx]) || 0,
          confidence: conf.value,
          confidenceLabel: conf.label,
          satellite: (cols[satIdx] || "VIIRS").trim(),
          timestamp: `${cols[dateIdx]}T${(cols[timeIdx] || "0000")
            .padStart(4, "0")
            .replace(/(\d{2})(\d{2})/, "$1:$2")}:00Z`,
        };
      })
      .filter((h) => !Number.isNaN(h.lat) && !Number.isNaN(h.lng));

    return { hotspots, source: "FIRMS", count: hotspots.length, fetchedAt };
  } catch (err) {
    console.error("FIRMS fetch error:", err);
    return {
      hotspots: [],
      source: "FIRMS",
      count: 0,
      error: "Failed to fetch",
      fetchedAt,
    };
  }
}
