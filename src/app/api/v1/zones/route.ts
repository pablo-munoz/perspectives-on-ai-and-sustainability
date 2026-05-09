import { NextResponse } from "next/server";
import { riskZones } from "@/lib/mock-data";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { haversineKm } from "@/lib/geo";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const revalidate = 60;

const PROXIMITY_KM = 5.5;

export async function GET(req: Request) {
  const rl = await rateLimit(`v1:${clientIp(req)}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", resetMs: rl.resetMs },
      { status: 429, headers: rateHeaders(rl) }
    );
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";

  const [weather, firms] = await Promise.all([
    fetchWeatherCached(),
    fetchFirms(),
  ]);

  const hotspotZones = (() => {
    const set = new Set<string>();
    for (const h of firms.hotspots) {
      for (const z of riskZones) {
        if (haversineKm(h.lat, h.lng, z.center[0], z.center[1]) < PROXIMITY_KM)
          set.add(z.id);
      }
    }
    return [...set];
  })();

  const live = await computeDynamicRiskLive(
    {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
    },
    hotspotZones
  );

  const enriched = riskZones.map((z) => {
    const dyn = live.find((r) => r.zoneId === z.id);
    return {
      id: z.id,
      name: z.name,
      lat: z.center[0],
      lng: z.center[1],
      vegetation: z.vegetation,
      slopeDeg: z.slopeDeg,
      riskScore: dyn?.dynamicScore ?? z.riskScore,
      riskLevel: dyn?.riskLevel ?? z.riskLevel,
      hotspotsNearby: hotspotZones.includes(z.id),
    };
  });

  if (format === "geojson") {
    return new Response(JSON.stringify(toGeoJson(enriched)), {
      headers: {
        ...rateHeaders(rl),
        "Content-Type": "application/geo+json",
      },
    });
  }

  if (format === "csv") {
    const headers = [
      "id",
      "name",
      "lat",
      "lng",
      "riskScore",
      "riskLevel",
      "hotspotsNearby",
    ];
    const rows = enriched.map((z) =>
      headers.map((h) => (z as Record<string, unknown>)[h]).join(",")
    );
    return new Response([headers.join(","), ...rows].join("\n"), {
      headers: {
        ...rateHeaders(rl),
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="firesee-zones.csv"',
      },
    });
  }

  return NextResponse.json(
    {
      schema: "v1",
      generatedAt: new Date().toISOString(),
      zones: enriched,
    },
    { headers: rateHeaders(rl) }
  );
}

interface EnrichedZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vegetation: string;
  slopeDeg: number;
  riskScore: number;
  riskLevel: string;
  hotspotsNearby: boolean;
}

function toGeoJson(zones: EnrichedZone[]) {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [z.lng, z.lat] },
      properties: {
        id: z.id,
        name: z.name,
        riskScore: z.riskScore,
        riskLevel: z.riskLevel,
        hotspotsNearby: z.hotspotsNearby,
      },
    })),
  };
}

function rateHeaders(rl: {
  remaining: number;
  resetMs: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetMs / 1000)),
  };
}
