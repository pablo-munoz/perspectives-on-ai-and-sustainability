import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { riskZones } from "@/lib/mock-data";

interface NdviPoint {
  ts: string;
  ndvi: number | null;
  ndmi: number | null;
}

const HISTORY_KEY = (zoneId: string) => `ndvi:zone:${zoneId}:history`;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) {
    return NextResponse.json({ error: "zone not found" }, { status: 404 });
  }

  const store = kv();
  const points = await store.recent<NdviPoint>(HISTORY_KEY(id), 36);

  // Synthesize a plausible 36-week curve when KV is empty so the UI has
  // something to render. Real data lands as the GitHub Actions weekly
  // refresh runs and pushes points via a forthcoming POST endpoint.
  const series =
    points.length > 0
      ? points.reverse()
      : synthesizeSeries(zone.center[0], zone.id, 36);

  const last = series[series.length - 1];
  const prev = series[series.length - 5] ?? last;

  return NextResponse.json({
    zoneId: id,
    samples: series.length,
    persistent: store.isPersistent() && points.length > 0,
    series,
    summary: {
      latest: last,
      ndviTrend4w:
        last.ndvi != null && prev.ndvi != null ? last.ndvi - prev.ndvi : null,
      ndmiTrend4w:
        last.ndmi != null && prev.ndmi != null ? last.ndmi - prev.ndmi : null,
    },
  });
}

function synthesizeSeries(
  lat: number,
  zoneId: string,
  count: number
): NdviPoint[] {
  // Deterministic per-zone baseline + seasonal sinusoid, no rng. Produces a
  // believable curve ~0.45 mean with summer dip; flagged in the response as
  // non-persistent so callers know it isn't real GEE data yet.
  const seed = zoneId.charCodeAt(1) ?? 0;
  const out: NdviPoint[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(now - i * 7 * 86400_000).toISOString();
    const month = new Date(ts).getUTCMonth();
    const seasonal = -0.12 * Math.cos(((month - 1) * 2 * Math.PI) / 12);
    const trend = 0.45 + seasonal + (lat - 42) * 0.05 + ((seed % 7) - 3) * 0.01;
    const ndvi = round(clamp(trend - i * 0.0015, 0.05, 0.85));
    const ndmi = round(clamp(ndvi - 0.12, -0.2, 0.6));
    out.push({ ts, ndvi, ndmi });
  }
  return out;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function round(x: number) {
  return Math.round(x * 1000) / 1000;
}
