import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

interface SourceStatus {
  id: string;
  name: string;
  description: string;
  status: "fresh" | "stale" | "down";
  lastUpdated: string | null;
  expectedEvery: string;
  agedMs: number | null;
}

const SOURCES: Array<{
  id: string;
  name: string;
  description: string;
  cacheKey: string;
  field?: string;
  expectedEveryMs: number;
  expectedEveryLabel: string;
}> = [
  {
    id: "aemet",
    name: "AEMET",
    description: "Spanish meteorological agency · station 1690A",
    cacheKey: "weather:cache",
    field: "lastUpdated",
    expectedEveryMs: 60 * 60 * 1000,
    expectedEveryLabel: "1 h",
  },
  {
    id: "fwi",
    name: "Open-Meteo FWI",
    description: "Daily FWI / FFMC / DMC / DC computation",
    cacheKey: "fwi:cache:ourense",
    field: "fetchedAt",
    expectedEveryMs: 24 * 60 * 60 * 1000,
    expectedEveryLabel: "24 h",
  },
  {
    id: "snapshot",
    name: "Risk snapshots",
    description: "Hourly cron writes per-zone score history",
    cacheKey: "risk:meta:lastSnapshot",
    field: "ts",
    expectedEveryMs: 60 * 60 * 1000,
    expectedEveryLabel: "1 h",
  },
];

export async function GET() {
  const store = kv();
  const now = Date.now();

  const out: SourceStatus[] = await Promise.all(
    SOURCES.map(async (src) => {
      const raw = await store.get<Record<string, unknown>>(src.cacheKey);
      const stamp = raw && typeof raw === "object" ? raw[src.field ?? "lastUpdated"] : null;
      const lastUpdated = typeof stamp === "string" ? stamp : null;
      const aged = lastUpdated ? now - new Date(lastUpdated).getTime() : null;

      let status: SourceStatus["status"] = "down";
      if (aged != null) {
        if (aged < src.expectedEveryMs * 1.5) status = "fresh";
        else if (aged < src.expectedEveryMs * 5) status = "stale";
        else status = "down";
      }

      return {
        id: src.id,
        name: src.name,
        description: src.description,
        status,
        lastUpdated,
        expectedEvery: src.expectedEveryLabel,
        agedMs: aged,
      };
    })
  );

  // Live-probe FIRMS, EFFIS, GIBS via HEAD (cached 5 min in KV).
  const probes = await runProbes(store);
  out.push(...probes);

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    persistent: store.isPersistent(),
    sources: out,
  });
}

interface ProbeSpec {
  id: string;
  name: string;
  description: string;
  url: string;
  expectedEvery: string;
}

const PROBES: ProbeSpec[] = [
  {
    id: "firms",
    name: "NASA FIRMS",
    description: "Active fire detections (VIIRS 375 m)",
    url: "https://firms.modaps.eosdis.nasa.gov",
    expectedEvery: "10 min",
  },
  {
    id: "effis",
    name: "Copernicus EFFIS",
    description: "European FWI WMS overlay",
    url: "https://maps.effis.emergency.copernicus.eu/effis?service=WMS&request=GetCapabilities",
    expectedEvery: "Daily",
  },
  {
    id: "gibs",
    name: "NASA GIBS",
    description: "MODIS Terra true-color tiles",
    url: "https://gibs.earthdata.nasa.gov",
    expectedEvery: "Daily",
  },
  {
    id: "open-meteo",
    name: "Open-Meteo",
    description: "Forecast API for FWI inputs",
    url: "https://api.open-meteo.com/v1/forecast?latitude=42.34&longitude=-7.86&current=temperature_2m",
    expectedEvery: "1 h",
  },
];

async function runProbes(
  store: ReturnType<typeof kv>
): Promise<SourceStatus[]> {
  const now = Date.now();
  const cached = await store.get<{ ts: number; results: SourceStatus[] }>(
    "status:probes"
  );
  if (cached && now - cached.ts < 5 * 60 * 1000) return cached.results;

  const results = await Promise.all(
    PROBES.map(async (p): Promise<SourceStatus> => {
      const ok = await timedFetch(p.url, 5000);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: ok ? "fresh" : "down",
        lastUpdated: ok ? new Date().toISOString() : null,
        expectedEvery: p.expectedEvery,
        agedMs: ok ? 0 : null,
      };
    })
  );
  await store.set("status:probes", { ts: now, results }, { ex: 600 });
  return results;
}

async function timedFetch(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok || res.status === 405; // 405 = HEAD-only endpoints OK
  } catch {
    return false;
  }
}
