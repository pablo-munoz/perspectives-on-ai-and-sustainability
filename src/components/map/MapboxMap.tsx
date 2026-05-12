"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef } from "react";
import { useFirms, useRisk } from "@/lib/hooks";
import { riskZones, RISK_COLORS, type RiskZone } from "@/lib/mock-data";
import type { MapOverlayState } from "./MapLayersControl";

interface MapboxMapProps {
  selectedZoneId?: string | null;
  onZoneSelect?: (zone: RiskZone) => void;
  onHotspotSelect?: (hotspot: { lat: number; lng: number }) => void;
  isochrones?: GeoJSON.FeatureCollection | null;
  overlays?: MapOverlayState;
  /**
   * When provided, zone fill colors come from this snapshot (time-machine
   * mode) instead of the live `useRisk()` feed.
   */
  historicalZoneScores?: Map<string, { score: number; level: RiskZone["riskLevel"] }>;
}

const OURENSE_CENTER: [number, number] = [-7.85, 42.2];

function gibsDate(): string {
  // GIBS publishes Terra MODIS true-color with ~1 day lag — use yesterday.
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

const GIBS_LAYER_ID = "gibs-truecolor";
const GIBS_SOURCE_ID = "gibs-truecolor-src";
const EFFIS_LAYER_ID = "effis-fwi";
const EFFIS_SOURCE_ID = "effis-fwi-src";
const HISTORICAL_FIRES_LAYER_ID = "historical-fires";
const HISTORICAL_FIRES_SOURCE_ID = "historical-fires-src";

const ISOCHRONE_SOURCE_ID = "isochrones-src";
const ISOCHRONE_FILL_LAYER_ID = "isochrones-fill";
const ISOCHRONE_LINE_LAYER_ID = "isochrones-line";

export default function MapboxMap({
  selectedZoneId,
  onZoneSelect,
  onHotspotSelect,
  isochrones,
  overlays,
  historicalZoneScores,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hotspotMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const onZoneSelectRef = useRef(onZoneSelect);
  onZoneSelectRef.current = onZoneSelect;
  const onHotspotSelectRef = useRef(onHotspotSelect);
  onHotspotSelectRef.current = onHotspotSelect;

  const { firms } = useFirms();
  const { risk } = useRisk();

  const dynamicScores = useMemo(() => {
    if (historicalZoneScores) return historicalZoneScores;
    const map = new Map<string, { score: number; level: RiskZone["riskLevel"] }>();
    risk?.zones?.forEach((z) => {
      map.set(z.zoneId, { score: z.dynamicScore, level: z.riskLevel });
    });
    return map;
  }, [risk, historicalZoneScores]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("NEXT_PUBLIC_MAPBOX_TOKEN missing — map will not load.");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: OURENSE_CENTER,
      zoom: 9.2,
      pitch: 60,
      bearing: -18,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.scrollZoom.disable();
    map.scrollZoom.enable({ around: "center" });

    map.on("load", () => {
      // Terrain
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.6 });

      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 4,
        },
      });

      // Hillshade
      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "mapbox-dem",
        paint: {
          "hillshade-shadow-color": "#000000",
          "hillshade-highlight-color": "#3a2010",
          "hillshade-accent-color": "#1a1310",
          "hillshade-exaggeration": 0.6,
        },
      });

      // Zones source + layer
      map.addSource("zones", {
        type: "geojson",
        data: zonesToGeoJson(riskZones, dynamicScores),
      });

      map.addLayer({
        id: "zones-fill",
        type: "fill-extrusion",
        source: "zones",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-opacity": 0.55,
          "fill-extrusion-height": ["*", ["get", "score"], 1200],
          "fill-extrusion-base": 0,
        },
      });

      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.6,
          "line-opacity": 0.85,
        },
      });

      // ----- Optional overlay: NASA GIBS MODIS Terra true-color (yesterday) -----
      const dateStr = gibsDate();
      map.addSource(GIBS_SOURCE_ID, {
        type: "raster",
        tiles: [
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        ],
        tileSize: 256,
        maxzoom: 9,
        attribution: "Imagery © NASA EOSDIS GIBS",
      });
      map.addLayer({
        id: GIBS_LAYER_ID,
        type: "raster",
        source: GIBS_SOURCE_ID,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.7 },
      });

      // ----- Optional overlay: EFFIS Fire Weather Index (Copernicus WMS) -----
      // The `mf010.fwi` layer has a TIME dimension that defaults to
      // 2021-01-01 (winter) when omitted, producing fully-transparent tiles.
      // We pin TIME to yesterday UTC so the toggle actually shows current FWI.
      const effisDate = new Date(Date.now() - 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      map.addSource(EFFIS_SOURCE_ID, {
        type: "raster",
        tiles: [
          `https://maps.effis.emergency.copernicus.eu/effis?service=WMS&version=1.1.1&request=GetMap&layers=mf010.fwi&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&TIME=${effisDate}&bbox={bbox-epsg-3857}`,
        ],
        tileSize: 256,
        attribution: "© European Union, Copernicus EFFIS",
      });
      map.addLayer({
        id: EFFIS_LAYER_ID,
        type: "raster",
        source: EFFIS_SOURCE_ID,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.78 },
      });

      // ----- Isochrones (driving-distance polygons, ORS) -----
      map.addSource(ISOCHRONE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: ISOCHRONE_FILL_LAYER_ID,
        type: "fill",
        source: ISOCHRONE_SOURCE_ID,
        paint: {
          "fill-color": "#4a9eff",
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "value"],
            600,
            0.18,
            900,
            0.08,
          ],
        },
      });
      map.addLayer({
        id: ISOCHRONE_LINE_LAYER_ID,
        type: "line",
        source: ISOCHRONE_SOURCE_ID,
        paint: {
          "line-color": "#4a9eff",
          "line-width": 1.4,
          "line-opacity": 0.7,
          "line-dasharray": [2, 1],
        },
      });

      // ----- Optional overlay: historical fire perimeters (MITECO/EGIF) -----
      map.addSource(HISTORICAL_FIRES_SOURCE_ID, {
        type: "geojson",
        data: "/data/historical-fires-galicia.geojson",
      });
      map.addLayer({
        id: `${HISTORICAL_FIRES_LAYER_ID}-fill`,
        type: "fill",
        source: HISTORICAL_FIRES_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#a23b1c",
          "fill-opacity": 0.18,
        },
      });
      map.addLayer({
        id: HISTORICAL_FIRES_LAYER_ID,
        type: "line",
        source: HISTORICAL_FIRES_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#ff8a4c",
          "line-width": 0.8,
          "line-opacity": 0.7,
        },
      });

      map.on("click", "zones-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.properties?.id as string;
        const zone = riskZones.find((z) => z.id === id);
        if (zone) onZoneSelectRef.current?.(zone);
      });
      map.on("mouseenter", "zones-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "zones-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update zones data when dynamic scores change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("zones") as mapboxgl.GeoJSONSource | undefined;
      src?.setData(zonesToGeoJson(riskZones, dynamicScores));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [dynamicScores]);

  // Apply isochrones data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(ISOCHRONE_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      src?.setData(
        isochrones ?? { type: "FeatureCollection", features: [] }
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [isochrones]);

  // Apply overlay visibility toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlays) return;
    const apply = () => {
      const setVis = (layerId: string, visible: boolean) => {
        if (!map.getLayer(layerId)) return;
        map.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none"
        );
      };
      setVis(GIBS_LAYER_ID, overlays.gibs);
      setVis(EFFIS_LAYER_ID, overlays.effis);
      setVis(`${HISTORICAL_FIRES_LAYER_ID}-fill`, overlays.historicalFires);
      setVis(HISTORICAL_FIRES_LAYER_ID, overlays.historicalFires);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [overlays]);

  // Hotspot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    hotspotMarkersRef.current.forEach((m) => m.remove());
    hotspotMarkersRef.current = [];

    const hotspots = firms?.hotspots ?? [];
    hotspots.forEach((h) => {
      const conf = h.confidenceLabel?.toLowerCase() ?? "nominal";
      const el = document.createElement("div");
      el.className = `hotspot-pulse hotspot-${conf}`;
      const core = document.createElement("div");
      core.className = "hotspot-core";
      el.appendChild(core);

      el.style.cursor = "pointer";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onHotspotSelectRef.current?.({ lat: h.lat, lng: h.lng });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([h.lng, h.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
            `<div style="font-size:12px;line-height:1.5">
              <div style="font-weight:600;color:#ff6b1a;text-transform:uppercase;letter-spacing:0.1em;font-size:10px">Thermal Anomaly</div>
              <div style="margin-top:4px;color:#fafafa">${h.satellite}</div>
              <div style="color:#a8a8a8">Brightness ${h.brightness.toFixed(1)} K</div>
              <div style="color:#a8a8a8">Confidence ${h.confidence}% (${h.confidenceLabel})</div>
              <div style="color:#a8a8a8;margin-top:4px;font-style:italic">Click for nearby resources</div>
            </div>`
          )
        )
        .addTo(map);
      hotspotMarkersRef.current.push(marker);
    });
  }, [firms]);

  // Fly to selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZoneId) return;
    const zone = riskZones.find((z) => z.id === selectedZoneId);
    if (!zone) return;
    map.flyTo({
      center: [zone.center[1], zone.center[0]],
      zoom: 11.2,
      pitch: 65,
      duration: 1400,
      essential: true,
    });
  }, [selectedZoneId]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full flex items-center justify-center text-center px-6">
        <div className="max-w-md">
          <div className="section-label text-[var(--color-warning)]">Map unavailable</div>
          <h3 className="mt-2 font-display text-xl">Mapbox token required</h3>
          <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
            Add <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">.env.local</code> to render the
            3D terrain map.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

function zonesToGeoJson(
  zones: RiskZone[],
  dynamic: Map<string, { score: number; level: RiskZone["riskLevel"] }>
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => {
      const dyn = dynamic.get(z.id);
      const level = dyn?.level ?? z.riskLevel;
      const score = dyn?.score ?? z.riskScore;
      const ring = [...z.coordinates, z.coordinates[0]].map(
        ([lat, lng]) => [lng, lat] as [number, number]
      );
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          id: z.id,
          name: z.name,
          level,
          score,
          color: RISK_COLORS[level] ?? "#888",
        },
      };
    }),
  };
}
