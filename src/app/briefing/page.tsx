import { fetchFirms, fetchWeatherCached } from "@/lib/data-sources";
import { computeDynamicRiskLive } from "@/lib/risk-engine";
import { kv } from "@/lib/kv";
import { riskZones, RISK_LABELS } from "@/lib/mock-data";
import { haversineKm } from "@/lib/geo";
import type { FwiResponse } from "@/lib/fwi";
import { classifyFWI, FWI_CLASS_LABEL } from "@/lib/fwi";
import "@/app/globals.css";

export const revalidate = 1800;

const PROXIMITY_KM = 5.5;

export const metadata = {
  title: "Daily briefing — Fire-See",
};

export default async function BriefingPage() {
  const store = kv();
  const [weather, firms, fwiCache] = await Promise.all([
    fetchWeatherCached(),
    fetchFirms(),
    store.get<FwiResponse>("fwi:cache:ourense"),
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

  const ranked = live.sort((a, b) => b.dynamicScore - a.dynamicScore);
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main
      style={{
        background: "white",
        color: "black",
        minHeight: "100vh",
        padding: "32px 48px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          borderBottom: "2px solid #000",
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#666",
          }}
        >
          Daily briefing · Fire-See · Ourense
        </div>
        <h1
          style={{
            margin: "6px 0 0",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {today}
        </h1>
      </header>

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionTitle}>Headline</h2>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
          {ranked[0]?.riskLevel === "critical" || ranked[0]?.riskLevel === "high"
            ? `${ranked[0].zoneName} is the highest-risk zone today at ${Math.round(
                ranked[0].dynamicScore * 100
              )}% (${RISK_LABELS[ranked[0].riskLevel]}).`
            : `All eight zones are at low or moderate risk. Highest is ${
                ranked[0]?.zoneName ?? "—"
              } at ${Math.round((ranked[0]?.dynamicScore ?? 0) * 100)}%.`}{" "}
          {fwiCache?.current
            ? `EFFIS-aligned FWI: ${fwiCache.current.fwi.toFixed(1)} (${FWI_CLASS_LABEL[
                classifyFWI(fwiCache.current.fwi)
              ]}).`
            : null}
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionTitle}>Weather (AEMET station 1690A)</h2>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={th}>Temperature</th>
              <td style={td}>
                {weather.temperature != null
                  ? `${weather.temperature.toFixed(1)} °C`
                  : "—"}
              </td>
              <th style={th}>Humidity</th>
              <td style={td}>
                {weather.humidity != null ? `${weather.humidity}%` : "—"}
              </td>
            </tr>
            <tr>
              <th style={th}>Wind</th>
              <td style={td}>
                {weather.windSpeed != null
                  ? `${weather.windSpeed} km/h ${weather.windDirection ?? ""}`.trim()
                  : "—"}
              </td>
              <th style={th}>Precipitation 24 h</th>
              <td style={td}>
                {weather.precipitation != null
                  ? `${weather.precipitation} mm`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionTitle}>Per-zone risk ranking</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Rank</th>
              <th style={th}>Zone</th>
              <th style={th}>Score</th>
              <th style={th}>Level</th>
              <th style={th}>Modifiers</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.zoneId}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{r.zoneName}</td>
                <td style={tdNum}>{Math.round(r.dynamicScore * 100)}%</td>
                <td style={td}>{RISK_LABELS[r.riskLevel]}</td>
                <td style={tdSmall}>
                  {r.modifiersApplied.length
                    ? r.modifiersApplied.join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {fwiCache?.forecast?.length && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={sectionTitle}>FWI forecast (next 7 days)</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>FWI</th>
                <th style={th}>Class</th>
                <th style={th}>FFMC</th>
                <th style={th}>DC</th>
              </tr>
            </thead>
            <tbody>
              {fwiCache.forecast.slice(0, 7).map((d) => (
                <tr key={d.date}>
                  <td style={td}>{d.date}</td>
                  <td style={tdNum}>{d.fwi.toFixed(1)}</td>
                  <td style={td}>
                    {FWI_CLASS_LABEL[classifyFWI(d.fwi)]}
                  </td>
                  <td style={tdNum}>{d.ffmc.toFixed(0)}</td>
                  <td style={tdNum}>{d.dc.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionTitle}>Active hotspots ({firms.hotspots.length})</h2>
        {firms.hotspots.length === 0 ? (
          <p style={{ fontSize: 13, color: "#444" }}>
            FIRMS reports no thermal anomalies in the Ourense bounding box in
            the last 48 hours.
          </p>
        ) : (
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
            {firms.hotspots.slice(0, 8).map((h) => (
              <li key={h.id}>
                {h.lat.toFixed(3)}, {h.lng.toFixed(3)} —{" "}
                {h.brightness.toFixed(0)} K · {h.confidence}% (
                {h.confidenceLabel}) · {h.satellite}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer
        style={{
          marginTop: 40,
          paddingTop: 12,
          borderTop: "1px solid #ccc",
          fontSize: 10,
          color: "#666",
        }}
      >
        Sources: AEMET · NASA FIRMS · Open-Meteo · Copernicus EFFIS · Sentinel-2.{" "}
        Methodology: <code>/methodology</code>. Generated automatically by
        Fire-See. Not a substitute for official emergency channels — call 112.
      </footer>

      <noscript />

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </main>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#666",
  margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  fontSize: 12,
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #444",
  fontWeight: 600,
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#222",
};

const td: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #eee",
};

const tdNum: React.CSSProperties = {
  ...td,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
};

const tdSmall: React.CSSProperties = {
  ...td,
  fontSize: 11,
  color: "#444",
};
