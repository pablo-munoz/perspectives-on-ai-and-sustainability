"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import RiskSummaryFloat from "@/components/map/RiskSummaryFloat";
import WeatherContextFloat from "@/components/map/WeatherContextFloat";
import CriticalAlertFloat from "@/components/map/CriticalAlertFloat";
import CoordinatesPill from "@/components/map/CoordinatesPill";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import ZoneThreatDistribution from "@/components/charts/ZoneThreatDistribution";
import type { RiskZone } from "@/lib/mock-data";

const MapboxMap = dynamic(() => import("@/components/map/MapboxMap"), {
  ssr: false,
});

export default function MapPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full">
      <MapboxMap
        selectedZoneId={selectedZoneId}
        onZoneSelect={(z: RiskZone) => setSelectedZoneId(z.id)}
      />

      {/* Top-left stack of floating panels */}
      <div className="pointer-events-none absolute top-5 left-5 flex flex-col gap-4 z-10 max-h-[calc(100%-220px)] overflow-y-auto pr-1 custom-scrollbar">
        <div className="pointer-events-auto">
          <RiskSummaryFloat />
        </div>
        <div className="pointer-events-auto">
          <WeatherContextFloat />
        </div>
        <div className="pointer-events-auto">
          <CriticalAlertFloat />
        </div>
      </div>

      {/* Top-right coordinates */}
      <div className="absolute top-5 right-5 z-10">
        <CoordinatesPill lat={42.235} lng={-7.85} />
      </div>

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
