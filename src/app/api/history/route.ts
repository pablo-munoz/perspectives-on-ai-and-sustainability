import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";

const HISTORY_KEY = "risk:history";

interface Snapshot {
  ts: string;
  avg: number;
  peak: { zoneId: string; zoneName: string; score: number };
  levelCounts: { critical: number; high: number; medium: number; low: number };
  zones: Array<{ id: string; score: number; base: number; level: string }>;
  hotspots: number;
}

const RANGE_CONFIG: Record<
  string,
  { lookbackHours: number; bucketMinutes: number }
> = {
  "7d": { lookbackHours: 7 * 24, bucketMinutes: 60 }, // hourly
  "30d": { lookbackHours: 30 * 24, bucketMinutes: 6 * 60 }, // 6-hourly
  "90d": { lookbackHours: 90 * 24, bucketMinutes: 24 * 60 }, // daily
};

function bucketKey(ts: string, bucketMinutes: number): number {
  const t = new Date(ts).getTime();
  return Math.floor(t / (bucketMinutes * 60_000));
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const cfg = RANGE_CONFIG[range] ?? RANGE_CONFIG["7d"];
  const zoneId = req.nextUrl.searchParams.get("zone");

  const store = kv();
  // The list can hold up to 90 days at 30-min cadence = 4320 entries; pull all
  // and filter client-side. recent() returns newest first; reverse here for
  // chronological order.
  const all = (await store.recent<Snapshot>(HISTORY_KEY, 4320)).reverse();

  const cutoff = Date.now() - cfg.lookbackHours * 3600_000;
  const inWindow = all.filter((s) => new Date(s.ts).getTime() >= cutoff);

  // Down-sample by bucket — keep the latest snapshot per bucket.
  const buckets = new Map<number, Snapshot>();
  for (const snap of inWindow) {
    buckets.set(bucketKey(snap.ts, cfg.bucketMinutes), snap);
  }
  const samples = [...buckets.values()].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const detail = req.nextUrl.searchParams.get("detail") === "full";

  // If a specific zone is requested, project the per-zone score.
  // If detail=full, include the entire zone array per snapshot (for time-machine).
  const series = zoneId
    ? samples.map((s) => ({
        ts: s.ts,
        score: s.zones.find((z) => z.id === zoneId)?.score ?? null,
        base: s.zones.find((z) => z.id === zoneId)?.base ?? null,
      }))
    : detail
    ? samples.map((s) => ({
        ts: s.ts,
        avg: s.avg,
        peak: s.peak.score,
        zones: s.zones,
      }))
    : samples.map((s) => ({
        ts: s.ts,
        avg: s.avg,
        peak: s.peak.score,
        critical: s.levelCounts.critical,
        high: s.levelCounts.high,
        medium: s.levelCounts.medium,
        low: s.levelCounts.low,
      }));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const headers = zoneId
      ? ["timestamp", "score", "base"]
      : ["timestamp", "avg", "peak", "critical", "high", "medium", "low"];
    const rows = series.map((s) =>
      headers.map((h) => (s as Record<string, unknown>)[h] ?? "").join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const filename = zoneId
      ? `firesee-${zoneId}-${range}.csv`
      : `firesee-aggregate-${range}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({
    range,
    bucketMinutes: cfg.bucketMinutes,
    samples: series.length,
    persistent: store.isPersistent(),
    series,
  });
}
