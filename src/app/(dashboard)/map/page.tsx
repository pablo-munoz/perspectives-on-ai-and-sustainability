"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import RiskSummaryFloat from "@/components/map/RiskSummaryFloat";
import WeatherContextFloat from "@/components/map/WeatherContextFloat";
import CriticalAlertFloat from "@/components/map/CriticalAlertFloat";
import HotspotContextFloat from "@/components/map/HotspotContextFloat";
import CoordinatesPill from "@/components/map/CoordinatesPill";
import MapLayersControl, {
  type MapOverlayState,
} from "@/components/map/MapLayersControl";
import TimeMachineSlider, {
  type ZoneScoreMap,
} from "@/components/map/TimeMachineSlider";
import WhatIfSlider from "@/components/map/WhatIfSlider";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import ZoneThreatDistribution from "@/components/charts/ZoneThreatDistribution";
import { usePois } from "@/lib/hooks";
import type { RiskZone } from "@/lib/mock-data";

const MapboxMap = dynamic(() => import("@/components/map/MapboxMap"), {
  ssr: false,
});

const DEFAULT_OVERLAYS: MapOverlayState = {
  gibs: false,
  effis: false,
  historicalFires: false,
};

export default function MapPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<MapOverlayState>(DEFAULT_OVERLAYS);
  const [tmActive, setTmActive] = useState(false);
  const [historical, setHistorical] = useState<{
    scores: ZoneScoreMap | null;
    ts: string | null;
  }>({ scores: null, ts: null });
  const [hotspot, setHotspot] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const { pois } = usePois(hotspot?.lat ?? null, hotspot?.lng ?? null);

  const isochroneFC = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!pois?.isochrones || pois.isochrones.length === 0) return null;
    return {
      type: "FeatureCollection",
      features: pois.isochrones as unknown as GeoJSON.Feature[],
    };
  }, [pois]);

  const toggle = (key: keyof MapOverlayState) =>
    setOverlays((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="relative h-full w-full">
      <MapboxMap
        selectedZoneId={selectedZoneId}
        onZoneSelect={(z: RiskZone) => setSelectedZoneId(z.id)}
        onHotspotSelect={(h) => setHotspot(h)}
        isochrones={isochroneFC}
        overlays={overlays}
        historicalZoneScores={
          tmActive && historical.scores ? historical.scores : undefined
        }
      />

      {/* Top-left stack of floating panels */}
      <div className="pointer-events-none absolute top-5 left-5 flex flex-col gap-4 z-10 max-h-[calc(100%-220px)] overflow-y-auto pr-1 custom-scrollbar">
        <div className="pointer-events-auto">
          <RiskSummaryFloat />
        </div>
        <div className="pointer-events-auto">
          <WeatherContextFloat />
        </div>
        {hotspot ? (
          <div className="pointer-events-auto">
            <HotspotContextFloat
              lat={hotspot.lat}
              lng={hotspot.lng}
              onClose={() => setHotspot(null)}
            />
          </div>
        ) : (
          <div className="pointer-events-auto">
            <CriticalAlertFloat />
          </div>
        )}
      </div>

      {/* Top-right: coordinates + layer toggles */}
      <div className="absolute top-5 right-5 z-10 flex flex-col gap-3 items-end">
        <CoordinatesPill lat={42.235} lng={-7.85} />
        <div className="pointer-events-auto">
          <MapLayersControl
            overlays={overlays}
            onToggle={toggle}
            timeMachineActive={tmActive}
            onToggleTimeMachine={() => setTmActive((v) => !v)}
          />
        </div>
        <WhatIfSlider />
      </div>

      {/* Time machine slider — appears above the bottom charts when active */}
      {tmActive && (
        <div className="absolute bottom-[148px] left-5 right-5 z-20 pointer-events-auto">
          <TimeMachineSlider
            onChange={(scores, ts) => setHistorical({ scores, ts })}
            onClose={() => setTmActive(false)}
          />
        </div>
      )}

      {/* Bottom strip charts */}
      <div className="absolute bottom-5 left-5 right-5 z-10 grid grid-cols-2 gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <RiskTrendChart />
        </div>
        <div className="pointer-events-auto">
          <ZoneThreatDistribution />
        </div>
      </div>
    </div>
  );
}
