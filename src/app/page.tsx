"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import RiskChart from "@/components/RiskChart";
import type { RiskZone } from "@/lib/mock-data";
import { Flame, Radio } from "lucide-react";

const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

export default function Home() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const handleZoneSelect = (zone: RiskZone) => {
    setSelectedZoneId(zone.id);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              Fire Watch <span className="text-red-400">Ourense</span>
            </h1>
            <p className="text-[10px] text-slate-400">
              AI-Powered Wildfire Risk Mapping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </div>
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          onZoneSelect={handleZoneSelect}
          selectedZoneId={selectedZoneId}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Map */}
          <div className="flex-1 min-h-0 p-2">
            <FireMap
              onZoneSelect={handleZoneSelect}
              selectedZoneId={selectedZoneId}
            />
          </div>

          {/* Charts */}
          <div className="flex-shrink-0 h-52 p-2 pt-0">
            <RiskChart />
          </div>
        </div>
      </div>
    </div>
  );
}
