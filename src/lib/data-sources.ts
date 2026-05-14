/**
 * Shared data-source functions used by API routes.
 * Centralising here avoids cross-route fetch caching that
 * can lock in cold-start failure responses.
 */

import https from "node:https";
import { URL } from "node:url";

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

  // AEMET's TLS stack is incompatible with Node's undici fetch — every request
  // closes the socket mid-handshake with UND_ERR_SOCKET, while `curl` and
  // Node's native `https` module work fine against the same endpoint.
  // We use `node:https` directly to dodge undici. (Vercel's Node runtime
  // exposes this; routes calling AEMET must not be edge.)
  const aemetGet = (url: string, sendKey: boolean, timeoutMs: number) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          path: `${u.pathname}${u.search}`,
          method: "GET",
          headers: sendKey ? { api_key: key } : {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () =>
            resolve({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
            })
          );
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error("aemet timeout")));
      req.end();
    });

  // AEMET returns metadata as application/json but the actual `datos` blob as
  // text/plain;charset=ISO-8859-15 even though the body is valid JSON. We
  // can't gate on Content-Type alone — instead read text and try to parse,
  // rejecting only if the body is clearly not JSON (e.g. an HTML error page).
  const parseBody = (body: string, status: number) => {
    const trimmed = body.trim();
    if (!trimmed || trimmed.startsWith("<")) {
      throw new Error(`non-JSON body (${status})`);
    }
    return JSON.parse(trimmed);
  };

  // AEMET's edge regularly returns empty replies under load; retry a few
  // times with short backoff before giving up.
  const fetchWithRetry = async (
    url: string,
    sendKey: boolean,
    timeoutMs: number,
    attempts = 3
  ) => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const { status, body } = await aemetGet(url, sendKey, timeoutMs);
        return parseBody(body, status);
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
    throw lastErr;
  };

  // Attempt 1: live observation from station 1690A. Isolated try so a TLS
  // hang here doesn't skip the forecast fallback below.
  try {
    const meta = await fetchWithRetry(
      `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${STATION_ID}`,
      true,
      2500,
      2
    );
    if (meta?.estado === 200 && meta?.datos) {
      const obs = await fetchWithRetry(meta.datos, false, 5000, 3);
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
  } catch (err) {
    console.warn("[AEMET] observation unavailable, trying forecast:", err);
  }

  // Attempt 2: municipal daily forecast (32054 = Ourense).
  try {
    const fJson = await fetchWithRetry(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/32054`,
      true,
      4000,
      3
    );
    if (fJson?.estado === 200 && fJson?.datos) {
      const forecast = await fetchWithRetry(fJson.datos, false, 5000, 3);
      const today = forecast?.[0]?.prediccion?.dia?.[0];
      if (today) {
        return {
          temperature: today.temperatura?.maxima ?? null,
          humidity: today.humedadRelativa?.minima ?? null,
          windSpeed: null,
          windDirection: null,
          precipitation: today.probPrecipitacion?.[0]?.value ?? 0,
          // Use fetch time, not AEMET's `elaborado` (production timestamp).
          // The status route ages this against expectedEveryMs, and the daily
          // forecast's `elaborado` can be hours stale even right after fetch.
          lastUpdated,
          source: "AEMET Forecast",
          station: "Ourense (32054)",
        };
      }
    }
  } catch (err) {
    console.error("[AEMET] forecast fetch failed:", err);
  }

  // Attempt 3: Open-Meteo current conditions. Key-less, very reliable.
  // Listed as a data source on the public methodology page, so this is not
  // a covert dependency — it's the documented fallback when AEMET is down.
  try {
    const om = new URL("https://api.open-meteo.com/v1/forecast");
    om.searchParams.set("latitude", "42.34");
    om.searchParams.set("longitude", "-7.86");
    om.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
    );
    om.searchParams.set("timezone", "Europe/Madrid");

    const res = await fetch(om, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          wind_speed_10m?: number;
          wind_direction_10m?: number;
          precipitation?: number;
        };
      };
      const c = json.current;
      if (c && typeof c.temperature_2m === "number") {
        return {
          temperature: c.temperature_2m,
          humidity: c.relative_humidity_2m ?? null,
          windSpeed: c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) : null,
          windDirection:
            c.wind_direction_10m != null
              ? degreesToDirection(c.wind_direction_10m)
              : null,
          precipitation: c.precipitation ?? 0,
          lastUpdated,
          source: "Open-Meteo (live)",
          station: "Ourense 42.34N / 7.86W",
        };
      }
    }
  } catch (err) {
    console.error("[Open-Meteo] current fetch failed:", err);
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
