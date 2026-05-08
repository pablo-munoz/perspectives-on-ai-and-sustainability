import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";

export const revalidate = 0;

interface PoiPoint {
  id: string;
  name: string;
  type: "fire_station" | "hospital" | "water" | "shelter";
  lat: number;
  lng: number;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface IsochroneFeature {
  type: "Feature";
  properties: { value: number };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

interface PoiResponse {
  pois: PoiPoint[];
  isochrones: IsochroneFeature[] | null;
  isochroneSource: string | null;
  fetchedAt: string;
}

const CACHE_TTL = 30 * 60;

function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="fire_station"](around:${radiusM},${lat},${lng});
  way["amenity"="fire_station"](around:${radiusM},${lat},${lng});
  node["amenity"="hospital"](around:${radiusM},${lat},${lng});
  way["amenity"="hospital"](around:${radiusM},${lat},${lng});
  node["emergency"="assembly_point"](around:${radiusM},${lat},${lng});
  node["natural"="water"](around:${radiusM},${lat},${lng});
  way["natural"="water"](around:${radiusM},${lat},${lng});
  way["water"="reservoir"](around:${radiusM},${lat},${lng});
);
out center tags;`;
}

function classify(tags: Record<string, string> | undefined): PoiPoint["type"] | null {
  if (!tags) return null;
  if (tags.amenity === "fire_station") return "fire_station";
  if (tags.amenity === "hospital") return "hospital";
  if (tags.emergency === "assembly_point") return "shelter";
  if (tags.natural === "water" || tags.water === "reservoir") return "water";
  return null;
}

async function fetchOverpass(lat: number, lng: number, radiusM: number): Promise<PoiPoint[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery(lat, lng, radiusM))}`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = (await res.json()) as OverpassResponse;
  const pois: PoiPoint[] = [];
  for (const el of json.elements ?? []) {
    const t = classify(el.tags);
    if (!t) continue;
    const lat2 = el.lat ?? el.center?.lat;
    const lng2 = el.lon ?? el.center?.lon;
    if (lat2 == null || lng2 == null) continue;
    pois.push({
      id: `${el.type}-${el.id}`,
      name: el.tags?.name ?? el.tags?.["name:gl"] ?? el.tags?.["name:es"] ?? defaultName(t),
      type: t,
      lat: lat2,
      lng: lng2,
    });
  }
  return pois;
}

function defaultName(t: PoiPoint["type"]): string {
  return {
    fire_station: "Parque de bombeiros",
    hospital: "Hospital",
    shelter: "Punto de encontro",
    water: "Punto de auga",
  }[t];
}

async function fetchIsochrones(lat: number, lng: number): Promise<IsochroneFeature[] | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(
    "https://api.openrouteservice.org/v2/isochrones/driving-car",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        locations: [[lng, lat]],
        range: [600, 900], // 10 min, 15 min
        attributes: ["area"],
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return (json.features ?? []) as IsochroneFeature[];
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  const radius = Math.min(
    20_000,
    parseInt(req.nextUrl.searchParams.get("radius") ?? "10000", 10) || 10_000
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  const store = kv();
  const cacheKey = `pois:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
  const cached = await store.get<PoiResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  let pois: PoiPoint[] = [];
  try {
    pois = await fetchOverpass(lat, lng, radius);
  } catch (err) {
    return NextResponse.json(
      { error: "Overpass unavailable", reason: String(err) },
      { status: 503 }
    );
  }

  const iso = await fetchIsochrones(lat, lng).catch(() => null);

  const response: PoiResponse = {
    pois,
    isochrones: iso,
    isochroneSource: iso ? "OpenRouteService" : null,
    fetchedAt: new Date().toISOString(),
  };
  await store.set(cacheKey, response, { ex: CACHE_TTL });
  return NextResponse.json(response);
}
