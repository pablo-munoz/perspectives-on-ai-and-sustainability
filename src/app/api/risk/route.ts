import { NextResponse } from "next/server";
import { computeDynamicRisk, getModelInfo } from "@/lib/risk-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin") || request.headers.get("host") || "localhost:4000";
  const protocol = origin.includes("localhost") ? "http" : "https";

  try {
    // Fetch live weather from our own API
    const weatherRes = await fetch(`${protocol}://${origin}/api/weather`, {
      next: { revalidate: 1800 },
    });
    const weather = await weatherRes.json();

    // Fetch FIRMS data to check for active hotspots
    const firmsRes = await fetch(`${protocol}://${origin}/api/firms`, {
      next: { revalidate: 3600 },
    });
    const firms = await firmsRes.json();

    // Determine which zones have active hotspots
    const activeHotspotZones: string[] = [];
    if (firms.hotspots && firms.hotspots.length > 0) {
      // Simple proximity check — if hotspot is near a zone center
      activeHotspotZones.push(...detectHotspotZones(firms.hotspots));
    }

    // Compute dynamic risk scores
    const riskResults = computeDynamicRisk(
      {
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        precipitation: weather.precipitation,
      },
      activeHotspotZones
    );

    const modelInfo = getModelInfo();

    return NextResponse.json({
      zones: riskResults,
      model: modelInfo,
      weather: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        source: weather.source,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Risk API error:", err);

    // Fallback: compute with no weather data
    const riskResults = computeDynamicRisk({
      temperature: null,
      humidity: null,
      windSpeed: null,
      precipitation: null,
    });

    return NextResponse.json({
      zones: riskResults,
      model: getModelInfo(),
      weather: null,
      timestamp: new Date().toISOString(),
      error: "Weather data unavailable, showing base ML scores only",
    });
  }
}

function detectHotspotZones(
  hotspots: Array<{ lat: number; lng: number }>
): string[] {
  // Zone centers for proximity matching
  const zoneCenters: Record<string, [number, number]> = {
    z1: [42.3, -7.935],
    z2: [42.4, -7.715],
    z3: [41.975, -8.085],
    z4: [42.225, -7.835],
    z5: [42.2, -8.035],
    z6: [42.145, -7.535],
    z7: [42.16, -7.97],
    z8: [41.955, -7.435],
  };

  const THRESHOLD_DEG = 0.05; // ~5km
  const affectedZones = new Set<string>();

  for (const spot of hotspots) {
    for (const [zoneId, [lat, lng]] of Object.entries(zoneCenters)) {
      const dist = Math.sqrt(
        Math.pow(spot.lat - lat, 2) + Math.pow(spot.lng - lng, 2)
      );
      if (dist < THRESHOLD_DEG) {
        affectedZones.add(zoneId);
      }
    }
  }

  return Array.from(affectedZones);
}
