import { NextResponse } from "next/server";
import { fetchFirms } from "@/lib/data-sources";
import { dbscan, groupByCluster } from "@/lib/dbscan";
import { riskZones } from "@/lib/mock-data";
import { haversineKm } from "@/lib/geo";

export const revalidate = 600;

const NEARBY_KM = 8;

interface Incident {
  id: string;
  centroid: { lat: number; lng: number };
  detections: number;
  firstDetected: string;
  lastDetected: string;
  agedHours: number;
  status: "active" | "cooling" | "cold";
  peakBrightness: number;
  zoneId: string | null;
  zoneName: string | null;
}

function statusFromAge(hours: number): Incident["status"] {
  if (hours < 12) return "active";
  if (hours < 36) return "cooling";
  return "cold";
}

export async function GET() {
  const firms = await fetchFirms();
  const points = firms.hotspots.map((h) => ({
    lat: h.lat,
    lng: h.lng,
    brightness: h.brightness,
    timestamp: h.timestamp,
  }));

  const labels = dbscan(points, { epsKm: 2, tauHours: 48, minPts: 2 });
  const clusters = groupByCluster(points, labels);

  // Singleton high-confidence detections still count as 1-detection incidents
  // so single isolated fires do not vanish.
  const noise = points.filter((_, i) => labels[i] === -1);

  const now = Date.now();

  const incidents: Incident[] = [
    ...clusters.map((cluster, idx) => buildIncident(`c-${idx}`, cluster, now)),
    ...noise.map((p, idx) => buildIncident(`s-${idx}`, [p], now)),
  ].sort(
    (a, b) =>
      new Date(b.lastDetected).getTime() - new Date(a.lastDetected).getTime()
  );

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    count: incidents.length,
    sourceCount: points.length,
    incidents,
  });
}

function buildIncident(
  id: string,
  members: Array<{ lat: number; lng: number; brightness: number; timestamp: string }>,
  now: number
): Incident {
  const sumLat = members.reduce((s, p) => s + p.lat, 0);
  const sumLng = members.reduce((s, p) => s + p.lng, 0);
  const centroid = {
    lat: sumLat / members.length,
    lng: sumLng / members.length,
  };
  const stamps = members.map((p) => new Date(p.timestamp).getTime());
  const first = Math.min(...stamps);
  const last = Math.max(...stamps);
  const aged = Math.max(0, (now - last) / 3600_000);

  const zone = riskZones.find(
    (z) => haversineKm(centroid.lat, centroid.lng, z.center[0], z.center[1]) < NEARBY_KM
  );

  return {
    id,
    centroid,
    detections: members.length,
    firstDetected: new Date(first).toISOString(),
    lastDetected: new Date(last).toISOString(),
    agedHours: Math.round(aged * 10) / 10,
    status: statusFromAge(aged),
    peakBrightness: Math.round(
      Math.max(...members.map((p) => p.brightness ?? 0))
    ),
    zoneId: zone?.id ?? null,
    zoneName: zone?.name ?? null,
  };
}
