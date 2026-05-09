import { ImageResponse } from "next/og";
import { riskZones, RISK_COLORS, RISK_LABELS } from "@/lib/mock-data";
import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { haversineKm } from "@/lib/geo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PROXIMITY_KM = 5.5;

interface OgProps {
  params: Promise<{ id: string }>;
}

export default async function ZoneOg({ params }: OgProps) {
  const { id } = await params;
  const zone = riskZones.find((z) => z.id === id);
  if (!zone) return new ImageResponse(<div>Zone not found</div>, size);

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
  const result = live.find((r) => r.zoneId === zone.id);
  const score = result?.dynamicScore ?? zone.riskScore;
  const level = result?.riskLevel ?? zone.riskLevel;
  const color = RISK_COLORS[level];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #08090b 0%, #131418 50%, #1a0a04 100%)",
          color: "#fafafa",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "ui-sans-serif, system-ui",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#a8a8a8",
            fontSize: 18,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              background: "#ff6b1a",
              borderRadius: 4,
            }}
          />
          Fire-See · Wildfire intel
        </div>

        <div style={{ marginTop: 24, fontSize: 84, fontWeight: 700, lineHeight: 1, display: "flex" }}>
          {zone.name}
        </div>
        <div
          style={{
            marginTop: 8,
            color: "#a8a8a8",
            fontSize: 22,
            display: "flex",
          }}
        >
          {zone.center[0].toFixed(3)}°N, {Math.abs(zone.center[1]).toFixed(3)}°W · Ourense, Galicia
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#a8a8a8",
                fontSize: 18,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Risk score
            </div>
            <div
              style={{
                fontSize: 200,
                fontWeight: 700,
                color,
                lineHeight: 1,
                display: "flex",
                alignItems: "baseline",
              }}
            >
              {Math.round(score * 100)}
              <span style={{ fontSize: 80, marginLeft: 8 }}>%</span>
            </div>
            <div
              style={{
                marginTop: 4,
                color,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {RISK_LABELS[level]}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 24 }}>
            <Stat label="Temp" value={weather.temperature != null ? `${weather.temperature.toFixed(0)}°C` : "—"} />
            <Stat label="Humidity" value={weather.humidity != null ? `${weather.humidity}%` : "—"} />
            <Stat
              label="Wind"
              value={weather.windSpeed != null ? `${weather.windSpeed} km/h` : "—"}
            />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 64,
            color: "#7a7a7a",
            fontSize: 16,
            display: "flex",
          }}
        >
          firesee.app · live
        </div>
      </div>
    ),
    size
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, minWidth: 240 }}>
      <span style={{ color: "#a8a8a8", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 14 }}>
        {label}
      </span>
      <span style={{ color: "#fafafa", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
