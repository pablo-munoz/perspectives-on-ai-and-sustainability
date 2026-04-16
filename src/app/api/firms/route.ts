import { NextResponse } from "next/server";

// Ourense bounding box: west,south,east,north
const OURENSE_BBOX = "-8.5,41.8,-7.0,42.5";
const SOURCE = "VIIRS_SNPP_NRT";
const DAY_RANGE = "2";

export async function GET() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    return NextResponse.json({ error: "FIRMS_MAP_KEY not set" }, { status: 500 });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${SOURCE}/${OURENSE_BBOX}/${DAY_RANGE}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    const text = await res.text();

    if (!res.ok || text.includes("Error")) {
      // If no data for Ourense, return empty array (fires are rare)
      return NextResponse.json({ hotspots: [], source: "FIRMS", note: "No active fires detected in Ourense area" });
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ hotspots: [], source: "FIRMS" });
    }

    const headers = lines[0].split(",");
    const latIdx = headers.indexOf("latitude");
    const lngIdx = headers.indexOf("longitude");
    const brightIdx = headers.indexOf("bright_ti4");
    const confIdx = headers.indexOf("confidence");
    const dateIdx = headers.indexOf("acq_date");
    const timeIdx = headers.indexOf("acq_time");
    const satIdx = headers.indexOf("satellite");

    const hotspots = lines.slice(1).map((line, i) => {
      const cols = line.split(",");
      return {
        id: `firms-${i}`,
        lat: parseFloat(cols[latIdx]),
        lng: parseFloat(cols[lngIdx]),
        brightness: parseFloat(cols[brightIdx]) || 0,
        confidence: cols[confIdx] || "nominal",
        satellite: cols[satIdx] || SOURCE,
        timestamp: `${cols[dateIdx]}T${(cols[timeIdx] || "0000").replace(/(\d{2})(\d{2})/, "$1:$2")}:00Z`,
      };
    }).filter((h) => !isNaN(h.lat) && !isNaN(h.lng));

    return NextResponse.json({ hotspots, source: "FIRMS", count: hotspots.length });
  } catch (err) {
    console.error("FIRMS API error:", err);
    return NextResponse.json({ hotspots: [], source: "FIRMS", error: "Failed to fetch" });
  }
}
