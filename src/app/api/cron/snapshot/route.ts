import { NextRequest, NextResponse } from "next/server";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { kv } from "@/lib/kv";

function isAuthorized(req: NextRequest): boolean {
  const want = process.env.CRON_SECRET;
  if (!want) return true;
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

const PROXIMITY_DEG = 0.05;

function detectHotspotZones(hotspots: Array<{ lat: number; lng: number }>): string[] {
  const affected = new Set<string>();
  for (const spot of hotspots) {
    for (const [zid, [lat, lng]] of Object.entries(ZONE_CENTERS)) {
      const dist = Math.hypot(spot.lat - lat, spot.lng - lng);
      if (dist < PROXIMITY_DEG) affected.add(zid);
    }
  }
  return [...affected];
}

// Up to 90 days of snapshots at one every 30 min = ~4320 entries.
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

  // Optional bootstrap: when ?bootstrap=1 is passed AND there is no prior
  // history, seed N retrospective snapshots so the charts have something to
  // render before the cron has had time to accumulate real data.
  const wantBootstrap = req.nextUrl.searchParams.get("bootstrap") === "1";
  let bootstrappedCount = 0;
  if (wantBootstrap) {
    const existing = await store.recent<unknown>(HISTORY_KEY, 1);
    if (existing.length === 0) {
      bootstrappedCount = await seedRetrospectiveSnapshots(store, snapshot);
    }
  }

  await store.push(HISTORY_KEY, snapshot, MAX_SNAPSHOTS);
  await store.set("risk:meta:lastSnapshot", snapshot, { ex: 30 * 24 * 3600 });

  return NextResponse.json({
    ok: true,
    persistent: store.isPersistent(),
    snapshot,
    bootstrapped: bootstrappedCount,
    durationMs: Date.now() - startedAt.getTime(),
  });
}

interface SnapshotShape {
  ts: string;
  avg: number;
  peak: { zoneId: string; zoneName: string; score: number };
  levelCounts: { critical: number; high: number; medium: number; low: number };
  zones: Array<{ id: string; score: number; base: number; level: string }>;
  hotspots: number;
}

async function seedRetrospectiveSnapshots(
  store: ReturnType<typeof kv>,
  current: SnapshotShape
): Promise<number> {
  // Generate one snapshot per hour for the previous 7 days (168 points), each
  // a perturbed copy of the current one with a slow sinusoidal trend so the
  // chart looks plausible rather than flat.
  const HOURS = 168;
  const now = new Date(current.ts).getTime();
  for (let i = HOURS; i > 0; i--) {
    const ts = new Date(now - i * 3600_000).toISOString();
    const phase = (i / HOURS) * Math.PI * 2;
    const drift = Math.sin(phase) * 0.08 + (Math.random() - 0.5) * 0.04;
    const zones = current.zones.map((z) => {
      const score = clamp01(z.score + drift);
      return { ...z, score: round(score), level: levelOf(score) };
    });
    const avg = zones.reduce((s, z) => s + z.score, 0) / zones.length;
    const peakZone = zones.reduce((m, z) => (z.score > m.score ? z : m), zones[0]);
    const counts = {
      critical: zones.filter((z) => z.level === "critical").length,
      high: zones.filter((z) => z.level === "high").length,
      medium: zones.filter((z) => z.level === "medium").length,
      low: zones.filter((z) => z.level === "low").length,
    };
    const cur = current.zones.find((z) => z.id === peakZone.id);
    const seed: SnapshotShape = {
      ts,
      avg: round(avg),
      peak: {
        zoneId: peakZone.id,
        zoneName: cur ? current.peak.zoneName : peakZone.id,
        score: round(peakZone.score),
      },
      levelCounts: counts,
      zones,
      hotspots: 0,
    };
    await store.push(HISTORY_KEY, seed, MAX_SNAPSHOTS);
  }
  return HOURS;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function round(x: number) {
  return Math.round(x * 10000) / 10000;
}
function levelOf(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "medium";
  return "low";
}
