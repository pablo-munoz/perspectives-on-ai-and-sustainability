import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchFirms, fetchWeather } from "@/lib/data-sources";

interface DerivedAlert {
  id: string;
  type: "heat" | "wind" | "fire" | "drought" | "humidity";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
}

const cachedWeather = unstable_cache(fetchWeather, ["weather-aemet"], {
  revalidate: 300,
});
const cachedFirms = unstable_cache(fetchFirms, ["firms-ourense"], {
  revalidate: 600,
});

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const alerts: DerivedAlert[] = [];

  try {
    const [weather, firms] = await Promise.all([cachedWeather(), cachedFirms()]);

    if (weather.temperature != null) {
      if (weather.temperature >= 35) {
        alerts.push({
          id: "heat-extreme",
          type: "heat",
          severity: "critical",
          title: "Extreme Heat Warning",
          description: `Temperature reached ${Math.round(weather.temperature)}°C — extreme fire conditions across Ourense.`,
          timestamp: fetchedAt,
        });
      } else if (weather.temperature >= 30) {
        alerts.push({
          id: "heat-high",
          type: "heat",
          severity: "high",
          title: "High Temperature Advisory",
          description: `Current temperature ${Math.round(weather.temperature)}°C — elevated fire risk.`,
          timestamp: fetchedAt,
        });
      }
    }

    if (weather.humidity != null) {
      if (weather.humidity < 25) {
        alerts.push({
          id: "humidity-critical",
          type: "humidity",
          severity: "critical",
          title: "Critically Low Humidity",
          description: `Relative humidity at ${Math.round(weather.humidity)}% — vegetation extremely dry.`,
          timestamp: fetchedAt,
        });
      } else if (weather.humidity < 35) {
        alerts.push({
          id: "humidity-low",
          type: "drought",
          severity: "high",
          title: "Low Humidity Advisory",
          description: `Humidity at ${Math.round(weather.humidity)}% — vegetation moisture decreasing.`,
          timestamp: fetchedAt,
        });
      }
    }

    if (weather.windSpeed != null) {
      if (weather.windSpeed >= 40) {
        alerts.push({
          id: "wind-strong",
          type: "wind",
          severity: "critical",
          title: "Strong Wind Warning",
          description: `Sustained winds ${weather.windSpeed} km/h ${weather.windDirection ?? ""} — high fire-spread risk.`,
          timestamp: fetchedAt,
        });
      } else if (weather.windSpeed >= 25) {
        alerts.push({
          id: "wind-moderate",
          type: "wind",
          severity: "high",
          title: "Wind Advisory",
          description: `Winds at ${weather.windSpeed} km/h ${weather.windDirection ?? ""}.`,
          timestamp: fetchedAt,
        });
      }
    }

    if (weather.precipitation != null && weather.precipitation === 0) {
      alerts.push({
        id: "no-rain",
        type: "drought",
        severity: "medium",
        title: "Dry Conditions",
        description: "No measurable precipitation recorded today.",
        timestamp: fetchedAt,
      });
    }

    if (firms.hotspots.length > 0) {
      const highConf = firms.hotspots.filter((h) => h.confidence >= 70);
      if (highConf.length > 0) {
        alerts.push({
          id: "active-fire",
          type: "fire",
          severity: "critical",
          title: `${highConf.length} Active Fire${highConf.length > 1 ? "s" : ""} Detected`,
          description: `FIRMS satellite confirmed ${highConf.length} high-confidence thermal anomal${highConf.length > 1 ? "ies" : "y"} in Ourense province.`,
          timestamp: fetchedAt,
        });
      } else {
        alerts.push({
          id: "thermal-anomaly",
          type: "fire",
          severity: "high",
          title: "Thermal Anomalies Detected",
          description: `${firms.hotspots.length} low/nominal confidence detection${firms.hotspots.length > 1 ? "s" : ""} — verification recommended.`,
          timestamp: fetchedAt,
        });
      }
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
      fetchedAt,
      sources: { weather: weather.source, firms: firms.source },
    });
  } catch (err) {
    console.error("Alerts derivation error:", err);
    return NextResponse.json({ alerts: [], count: 0, fetchedAt, error: String(err) });
  }
}
