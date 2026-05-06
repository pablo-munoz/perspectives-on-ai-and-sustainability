import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchFirms, fetchWeather } from "@/lib/data-sources";
import {
  computeDynamicRisk,
  computeDynamicRiskLive,
  getModelInfo,
} from "@/lib/risk-engine";

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

const PROXIMITY_DEG = 0.05; // ~5 km

function detectHotspotZones(hotspots: Array<{ lat: number; lng: number }>): string[] {
  const affected = new Set<string>();
  for (const spot of hotspots) {
    for (const [zoneId, [lat, lng]] of Object.entries(ZONE_CENTERS)) {
      const dist = Math.sqrt(
        Math.pow(spot.lat - lat, 2) + Math.pow(spot.lng - lng, 2)
      );
      if (dist < PROXIMITY_DEG) affected.add(zoneId);
    }
  }
  return Array.from(affected);
}

const cachedWeather = unstable_cache(fetchWeather, ["weather-aemet"], {
  revalidate: 300,
});
const cachedFirms = unstable_cache(fetchFirms, ["firms-ourense"], {
  revalidate: 600,
});

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const [weather, firms] = await Promise.all([cachedWeather(), cachedFirms()]);

    const activeHotspotZones = detectHotspotZones(firms.hotspots);

    const zones = await computeDynamicRiskLive(
      {
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        precipitation: weather.precipitation,
      },
      activeHotspotZones
    );

    return NextResponse.json({
      zones,
      model: getModelInfo(),
      weather: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        source: weather.source,
      },
      activeHotspotZones,
      timestamp,
    });
  } catch (err) {
    console.error("Risk endpoint error:", err);
    const zones = computeDynamicRisk(
      { temperature: null, humidity: null, windSpeed: null, precipitation: null },
      []
    );
    return NextResponse.json({
      zones,
      model: getModelInfo(),
      weather: null,
      activeHotspotZones: [],
      timestamp,
      error: "Weather/FIRMS data unavailable",
    });
  }
}
