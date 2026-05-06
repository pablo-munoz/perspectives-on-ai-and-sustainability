"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface SatelliteViewProps {
  lat: number | null;
  lng: number | null;
  layer?: "MODIS_Terra" | "MODIS_Aqua" | "VIIRS_SNPP";
  dateOverride?: string; // "YYYY-MM-DD"
}

const GIBS_LAYERS: Record<NonNullable<SatelliteViewProps["layer"]>, string> = {
  MODIS_Terra: "MODIS_Terra_CorrectedReflectance_TrueColor",
  MODIS_Aqua: "MODIS_Aqua_CorrectedReflectance_TrueColor",
  VIIRS_SNPP: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
};

/**
 * Compute the most recent GIBS-available date.
 * GIBS publishes the previous day's imagery; today is usually not ready.
 */
function gibsDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function SatelliteView({
  lat,
  lng,
  layer = "MODIS_Terra",
  dateOverride,
}: SatelliteViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Use any to avoid pulling Leaflet's full type tree into a 50-line component.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const center: [number, number] =
        lat != null && lng != null ? [lat, lng] : [42.2, -7.85];

      const map = L.map(containerRef.current, {
        center,
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
      });

      const date = dateOverride ?? gibsDate();
      const tileUrl =
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYERS[layer]}` +
        `/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

      L.tileLayer(tileUrl, {
        attribution: "NASA GIBS",
        maxZoom: 9,
        minZoom: 1,
        tileSize: 256,
        bounds: [
          [-85.0511287776, -179.999999999],
          [85.0511287776, 179.999999999],
        ],
      }).addTo(map);

      if (lat != null && lng != null) {
        const icon = L.divIcon({
          className: "fire-hotspot-marker",
          html: '<div class="hotspot-pulse hotspot-high"><div class="hotspot-core"></div></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker([lat, lng], { icon }).addTo(map);
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, layer, dateOverride]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
