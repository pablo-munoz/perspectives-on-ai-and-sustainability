"use client";

import RiskSummary from "./RiskSummary";
import ModelPanel from "./ModelPanel";
import WeatherPanel from "./WeatherPanel";
import AlertsPanel from "./AlertsPanel";
import ZoneList from "./ZoneList";
import type { RiskZone } from "@/lib/mock-data";

interface SidebarProps {
  onZoneSelect?: (zone: RiskZone) => void;
  selectedZoneId?: string | null;
}

export default function Sidebar({ onZoneSelect, selectedZoneId }: SidebarProps) {
  return (
    <aside className="w-80 flex-shrink-0 h-full overflow-y-auto custom-scrollbar bg-slate-900/50 border-r border-slate-700 p-3 space-y-3">
      <RiskSummary />
      <ModelPanel />
      <WeatherPanel />
      <AlertsPanel />
      <ZoneList onZoneSelect={onZoneSelect} selectedZoneId={selectedZoneId} />
    </aside>
  );
}
