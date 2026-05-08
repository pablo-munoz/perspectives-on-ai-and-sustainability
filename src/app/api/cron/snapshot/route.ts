import { NextRequest, NextResponse } from "next/server";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { kv } from "@/lib/kv";
import { haversineKm } from "@/lib/geo";

function isAuthorized(req: NextRequest): boolean {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${want}`) return true;
  if (req.nextUrl.searchParams.get("secret") === want) return true;
  return false;
}

const ZONE_CENTERS: Record<string, [number, number]> = {
  z1: [42.3, -7.935],
  z2: [42.4, -7.715],
  z3: [41.975, -8.085],
  z4: [42.225, -7.835],
  z5: [42.2, -8.035],
  z6: [42.145, -7.535],
  z7: [42.16, -7.97],
  z8: [41.955, -7.435],
};

const PROXIMITY_KM = 5.5;

function detectHotspotZones(hotspots: Array<{ lat: number; lng: number }>): string[] {
  const affected = new Set<string>();
  for (const spot of hotspots) {
    for (const [zid, [lat, lng]] of Object.entries(ZONE_CENTERS)) {
      if (haversineKm(spot.lat, spot.lng, lat, lng) < PROXIMITY_KM) {
        affected.add(zid);
      }
    }
  }
  return [...affected];
}

const MAX_SNAPSHOTS = 4320;
const HISTORY_KEY = "risk:history";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const [weather, firms] = await Promise.all([fetchWeatherCached(), fetchFirms()]);
  const hotspotZones = detectHotspotZones(firms.hotspots);

  const zones = await computeDynamicRiskLive(
    {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
    },
    hotspotZones
  );

  const peak = zones.reduce((m, z) => (z.dynamicScore > m.dynamicScore ? z : m), zones[0]);
  const avg = zones.reduce((s, z) => s + z.dynamicScore, 0) / zones.length;

  const snapshot = {
    ts: startedAt.toISOString(),
    avg,
    peak: { zoneId: peak.zoneId, zoneName: peak.zoneName, score: peak.dynamicScore },
    levelCounts: {
      critical: zones.filter((z) => z.riskLevel === "critical").length,
      high: zones.filter((z) => z.riskLevel === "high").length,
      medium: zones.filter((z) => z.riskLevel === "medium").length,
      low: zones.filter((z) => z.riskLevel === "low").length,
    },
    zones: zones.map((z) => ({
      id: z.zoneId,
      score: Number(z.dynamicScore.toFixed(4)),
      base: Number(z.baseScore.toFixed(4)),
      level: z.riskLevel,
    })),
    hotspots: firms.hotspots.length,
  };

  const store = kv();
  await store.push(HISTORY_KEY, snapshot, MAX_SNAPSHOTS);
  await store.set("risk:meta:lastSnapshot", snapshot, { ex: 30 * 24 * 3600 });

  return NextResponse.json({
    ok: true,
    persistent: store.isPersistent(),
    snapshot,
    durationMs: Date.now() - startedAt.getTime(),
  });
}
