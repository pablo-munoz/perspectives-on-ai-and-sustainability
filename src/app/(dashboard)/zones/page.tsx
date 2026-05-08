"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolbarChip } from "@/components/ui/Toolbar";
import { ZoneCard } from "@/components/zones/ZoneCard";
import { useAlerts, useFirms, useRisk, useWeather } from "@/lib/hooks";
import { riskZones } from "@/lib/mock-data";
import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

const ZONE_BBOX_DEG = 0.06; // ~6 km half-side around zone center for hotspot count

export default function ZonesPage() {
  const { risk } = useRisk();
  const { weather } = useWeather();
  const { alerts } = useAlerts();
  const { firms } = useFirms();
  const [sortByRisk, setSortByRisk] = useState(true);

  const enriched = useMemo(() => {
    const hotspots = firms?.hotspots ?? [];
    return riskZones.map((z) => {
      const live = risk?.zones?.find((d) => d.zoneId === z.id);
      const [zlat, zlng] = z.center;
      const hotspotsInZone = hotspots.filter(
        (h) =>
          Math.abs(h.lat - zlat) < ZONE_BBOX_DEG &&
          Math.abs(h.lng - zlng) < ZONE_BBOX_DEG
      ).length;
      return {
        zone: z,
        liveLevel: live?.riskLevel ?? z.riskLevel,
        liveScore: live?.dynamicScore ?? z.riskScore,
        hotspotsInZone,
      };
    });
  }, [risk, firms]);

  const sorted = useMemo(() => {
    return sortByRisk
      ? [...enriched].sort((a, b) => b.liveScore - a.liveScore)
      : enriched;
  }, [enriched, sortByRisk]);

  const activeAlerts = alerts?.alerts?.length ?? 0;
  const total = riskZones.length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1500px] mx-auto">
      <SectionHeading
        title="Zones Management"
        subtitle="Real-time geospatial intelligence and risk perimeter monitoring"
      />

      <div className="mt-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <ToolbarChip
            active={sortByRisk}
            icon={<ArrowDownUp className="w-3 h-3" />}
            onClick={() => setSortByRisk((v) => !v)}
          >
            Sort by Risk
          </ToolbarChip>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.14em]">
          <div>
            <span className="text-[var(--color-fg-subtle)]">Total Zones</span>{" "}
            <span className="ml-2 font-bold text-[var(--color-fg)] tabular">
              {String(total).padStart(2, "0")}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-fg-subtle)]">Active Alerts</span>{" "}
            <span className="ml-2 font-bold text-[var(--color-critical)] tabular">
              {String(activeAlerts).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sorted.map(({ zone, liveLevel, hotspotsInZone }) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            liveLevel={liveLevel}
            weather={weather}
            hotspotsInZone={hotspotsInZone}
          />
        ))}
      </div>
    </div>
  );
}
