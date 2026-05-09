import { fetchWeatherCached, fetchFirms } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { riskZones } from "@/lib/mock-data";
import { haversineKm } from "@/lib/geo";

export const revalidate = 600;

const PROXIMITY_KM = 5.5;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;
  const now = new Date();

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

  const items = live
    .filter((r) => r.riskLevel === "high" || r.riskLevel === "critical")
    .map((r) => {
      const zone = riskZones.find((z) => z.id === r.zoneId);
      const title = `${zone?.name ?? r.zoneId} — ${r.riskLevel.toUpperCase()} risk (${Math.round(
        r.dynamicScore * 100
      )}%)`;
      const link = `${baseUrl}/zones/${r.zoneId}`;
      const description = `Risk score ${Math.round(
        r.dynamicScore * 100
      )}% · Modifiers: ${r.modifiersApplied.join(", ") || "none"} · Temp ${
        weather.temperature ?? "—"
      }°C · Humidity ${weather.humidity ?? "—"}% · Wind ${
        weather.windSpeed ?? "—"
      } km/h.`;
      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${r.zoneId}-${now.toISOString().slice(0, 10)}-${r.riskLevel}</guid>
      <pubDate>${now.toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fire-See · Galicia wildfire alerts</title>
    <link>${baseUrl}</link>
    <description>High and critical wildfire risk alerts for Ourense, Galicia.</description>
    <language>en-gb</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>${items || `
    <item>
      <title>No active alerts</title>
      <link>${baseUrl}</link>
      <description>All zones at low or moderate risk.</description>
      <pubDate>${now.toUTCString()}</pubDate>
      <guid isPermaLink="false">no-alerts-${now.toISOString().slice(0, 10)}</guid>
    </item>`}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    },
  });
}
