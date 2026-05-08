#!/usr/bin/env node
/**
 * Fetch the NASA FIRMS archive for the Ourense bounding box across recent
 * fire seasons (Jul-Sep) and emit a GeoJSON FeatureCollection of buffered
 * point polygons. Each cluster of points within ~3 km becomes a single
 * polygon, approximating burned-area perimeters.
 *
 *   Required env: FIRMS_MAP_KEY
 *   Output:       public/data/historical-fires-galicia.geojson
 *
 * Run with:  node scripts/fetch-historical-fires.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "historical-fires-galicia.geojson"
);

const KEY = process.env.FIRMS_MAP_KEY;
if (!KEY) {
  console.error("FIRMS_MAP_KEY not set — aborting.");
  process.exit(1);
}

const BBOX = "-8.5,41.8,-7.0,42.5"; // west,south,east,north
const PRODUCT = "VIIRS_SNPP_SP"; // archive (suffix SP)
const SEASONS = [2022, 2023, 2024];
const START_DOY = { month: 7, day: 1 };
const END_DOY = { month: 9, day: 30 };
const WINDOW_DAYS = 5; // FIRMS archive caps day range at 5
const CLUSTER_KM = 3;
const BUFFER_KM = 1;

function* iterWindows(year) {
  const start = new Date(Date.UTC(year, START_DOY.month - 1, START_DOY.day));
  const end = new Date(Date.UTC(year, END_DOY.month - 1, END_DOY.day));
  let d = start;
  while (d <= end) {
    yield d.toISOString().slice(0, 10);
    d = new Date(d.getTime() + WINDOW_DAYS * 86400_000);
  }
}

async function fetchWindow(date) {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/${PRODUCT}/${BBOX}/${WINDOW_DAYS}/${date}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[FIRMS] ${date} → HTTP ${res.status}`);
    return [];
  }
  const text = await res.text();
  if (text.includes("Invalid") || text.includes("Error")) return [];
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const latIdx = headers.indexOf("latitude");
  const lngIdx = headers.indexOf("longitude");
  const dateIdx = headers.indexOf("acq_date");
  const confIdx = headers.indexOf("confidence");
  const points = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = parseFloat(c[latIdx]);
    const lng = parseFloat(c[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    points.push({
      lat,
      lng,
      date: c[dateIdx] ?? date,
      confidence: c[confIdx] ?? "n",
    });
  }
  return points;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function clusterPoints(points, distKm) {
  // Greedy spatial clustering: walk through points, attach to first cluster
  // whose centroid is within distKm.
  const clusters = [];
  for (const p of points) {
    let attached = false;
    for (const c of clusters) {
      if (haversineKm(c.centroid, p) < distKm) {
        c.members.push(p);
        c.centroid = {
          lat:
            (c.centroid.lat * (c.members.length - 1) + p.lat) /
            c.members.length,
          lng:
            (c.centroid.lng * (c.members.length - 1) + p.lng) /
            c.members.length,
        };
        c.firstDate =
          p.date < c.firstDate ? p.date : c.firstDate;
        c.lastDate = p.date > c.lastDate ? p.date : c.lastDate;
        attached = true;
        break;
      }
    }
    if (!attached) {
      clusters.push({
        centroid: { lat: p.lat, lng: p.lng },
        members: [p],
        firstDate: p.date,
        lastDate: p.date,
      });
    }
  }
  return clusters;
}

function bufferAsPolygon({ lat, lng }, radiusKm, sides = 24) {
  // Approximate circular buffer around (lat,lng) at given radius, returned as
  // a GeoJSON Polygon coordinate ring [lng,lat].
  const ring = [];
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  ring.push(ring[0]);
  return ring;
}

async function main() {
  const all = [];
  for (const year of SEASONS) {
    for (const date of iterWindows(year)) {
      const pts = await fetchWindow(date);
      console.log(`${date}: ${pts.length} detections`);
      all.push(...pts);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  console.log(`Total detections: ${all.length}`);

  const clusters = clusterPoints(all, CLUSTER_KM);
  console.log(`Clusters: ${clusters.length}`);

  const features = clusters
    .filter((c) => c.members.length >= 3)
    .map((c, i) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          bufferAsPolygon(
            c.centroid,
            BUFFER_KM + Math.min(3, Math.log10(c.members.length))
          ),
        ],
      },
      properties: {
        id: `f-${i}`,
        detections: c.members.length,
        firstDate: c.firstDate,
        lastDate: c.lastDate,
        source: "FIRMS / VIIRS_SNPP archive",
      },
    }));

  const fc = { type: "FeatureCollection", features };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(fc));
  console.log(`Wrote ${features.length} polygons → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
