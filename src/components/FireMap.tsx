"use client";

import { useEffect, useState, useCallback } from "react";
import {
  riskZones,
  fireHotspots as mockHotspots,
  RISK_COLORS,
  type RiskZone,
  type FireHotspot,
} from "@/lib/mock-data";

interface FireMapProps {
  onZoneSelect?: (zone: RiskZone) => void;
  selectedZoneId?: string | null;
}

export default function FireMap({ onZoneSelect, selectedZoneId }: FireMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [hotspots, setHotspots] = useState<FireHotspot[]>(mockHotspots);
  const [dataSource, setDataSource] = useState<string>("mock");

  // Fetch live FIRMS data
  useEffect(() => {
    fetch("/api/firms")
      .then((res) => res.json())
      .then((data) => {
        if (data.hotspots && data.hotspots.length > 0) {
          setHotspots(data.hotspots);
          setDataSource("FIRMS Live");
        } else {
          setDataSource("Mock (no active fires in Ourense)");
        }
      })
      .catch(() => {
        setDataSource("Mock (API unavailable)");
      });
  }, []);

  const onZoneSelectStable = useCallback(
    (zone: RiskZone) => onZoneSelect?.(zone),
    [onZoneSelect]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css");

      const existing = document.getElementById("fire-map");
      if (!existing) return;
      if ((existing as HTMLElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map("fire-map", {
        center: [42.2, -7.85],
        zoom: 10,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      const osmLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 18,
        }
      );

      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "&copy; Esri",
          maxZoom: 18,
        }
      );

      osmLayer.addTo(map);

      // Risk zone polygons
      const zonesGroup = L.layerGroup();
      riskZones.forEach((zone) => {
        const polygon = L.polygon(
          zone.coordinates.map(([lat, lng]) => [lat, lng] as L.LatLngTuple),
          {
            color: RISK_COLORS[zone.riskLevel],
            fillColor: RISK_COLORS[zone.riskLevel],
            fillOpacity: 0.3,
            weight: 2,
          }
        );

        polygon.bindPopup(`
          <div style="font-family: system-ui; min-width: 180px;">
            <h3 style="margin: 0 0 6px; font-size: 14px; color: #1e293b;">${zone.name}</h3>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${RISK_COLORS[zone.riskLevel]}; color: white; font-size: 11px; font-weight: 600; margin-bottom: 8px;">
              ${zone.riskLevel.toUpperCase()} — ${(zone.riskScore * 100).toFixed(0)}%
            </div>
            <p style="margin: 4px 0; font-size: 12px; color: #475569;"><strong>Vegetation:</strong> ${zone.vegetation}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #475569;"><strong>Slope:</strong> ${zone.slopeDeg}°</p>
          </div>
        `);

        polygon.on("click", () => {
          onZoneSelectStable(zone);
        });

        polygon.addTo(zonesGroup);
      });
      zonesGroup.addTo(map);

      // Fire hotspot markers
      const hotspotsGroup = L.layerGroup();
      hotspots.forEach((spot) => {
        const pulseIcon = L.divIcon({
          className: "fire-hotspot-marker",
          html: `<div class="hotspot-pulse"><div class="hotspot-core"></div></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: pulseIcon });
        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 160px;">
            <h3 style="margin: 0 0 6px; font-size: 14px; color: #dc2626;">Active Fire Hotspot</h3>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Brightness:</strong> ${spot.brightness}K</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Confidence:</strong> ${spot.confidence}%</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Satellite:</strong> ${spot.satellite}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Time:</strong> ${new Date(spot.timestamp).toLocaleTimeString()}</p>
          </div>
        `);
        marker.addTo(hotspotsGroup);
      });
      hotspotsGroup.addTo(map);

      // Layer control
      L.control
        .layers(
          { "Dark Map": osmLayer, Satellite: satelliteLayer },
          { "Risk Zones": zonesGroup, "Fire Hotspots": hotspotsGroup },
          { position: "topright" }
        )
        .addTo(map);

      setMapReady(true);

      (window as unknown as Record<string, unknown>).__fireMap = map;
    });
  }, [hotspots, onZoneSelectStable]);

  // Zoom to selected zone
  useEffect(() => {
    if (!selectedZoneId || !mapReady) return;
    const map = (window as unknown as Record<string, unknown>).__fireMap as
      | import("leaflet").Map
      | undefined;
    if (!map) return;
    const zone = riskZones.find((z) => z.id === selectedZoneId);
    if (zone) {
      map.flyTo(zone.center as [number, number], 13, { duration: 1 });
    }
  }, [selectedZoneId, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div id="fire-map" className="h-full w-full rounded-lg" />
      {/* Data source badge */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-slate-900/90 text-[10px] text-slate-400 px-2 py-1 rounded">
        Source: {dataSource} — {hotspots.length} hotspot{hotspots.length !== 1 ? "s" : ""}
      </div>
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg">
          <div className="text-slate-400 animate-pulse">Loading map...</div>
        </div>
      )}
    </div>
  );
}
