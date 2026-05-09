"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusPill } from "@/components/ui/StatusPill";
import { MetricCard } from "@/components/ui/MetricCard";
import RiskIndexBars from "@/components/charts/RiskIndexBars";
import HistoricalVsPredicted from "@/components/charts/HistoricalVsPredicted";
import ForecastRibbon from "@/components/charts/ForecastRibbon";
import RiskHeatmapCalendar from "@/components/charts/RiskHeatmapCalendar";
import YearOverYear from "@/components/charts/YearOverYear";
import ProjectionWarning from "@/components/analytics/ProjectionWarning";
import SectorMappingContext from "@/components/analytics/SectorMappingContext";
import { useRisk, useWeather, useFirms, timeAgo } from "@/lib/hooks";
import { nelsonFMC } from "@/lib/fmc";
import { Leaf, Thermometer, Droplet, Download } from "lucide-react";
import { useMemo } from "react";

export default function AnalyticsPage() {
  const { risk } = useRisk();
  const { weather } = useWeather();
  const { firms } = useFirms();

  const ndvi = useMemo(() => {
    const zones = risk?.zones ?? [];
    if (!zones.length) return null;
    const avg = zones.reduce((s, z) => s + z.dynamicScore, 0) / zones.length;
    return Math.max(0.05, 0.55 - avg * 0.3);
  }, [risk]);

  const lst = weather?.temperature ?? null;
  const fmcResult = nelsonFMC({
    tempC: weather?.temperature ?? null,
    humidityPct: weather?.humidity ?? null,
    precipMm24h: weather?.precipitation ?? null,
  });
  const fmc = Number.isFinite(fmcResult.value) ? fmcResult.value : null;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1500px] mx-auto">
      <SectionHeading
        title="Environmental Analytics"
        subtitle="Global wildfire intelligence & predictive risk modelling — System active"
        right={
          <>
            <StatusPill tone="synced" pulse>
              Data synced: {timeAgo(firms?.fetchedAt)}
            </StatusPill>
            <a
              href="/api/history?range=90d&format=csv"
              download
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[var(--color-accent)] text-black text-[12px] font-bold uppercase tracking-[0.14em] hover:bg-[var(--color-accent-hi)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </>
        }
      />

      <div className="mt-8">
        <ForecastRibbon />
      </div>

      <div className="mt-5 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8">
          <RiskIndexBars />
        </div>
        <div className="col-span-12 lg:col-span-4 grid gap-4 content-stretch">
          <MetricCard
            label="NDVI Vegetation Index"
            termId="ndvi"
            value={ndvi != null ? ndvi.toFixed(2) : "—"}
            delta={
              ndvi != null
                ? {
                    value: ndvi < 0.3 ? "Drying trend sustained" : "Vegetation stable",
                    tone: ndvi < 0.3 ? "up" : "down",
                  }
                : undefined
            }
            icon={<Leaf className="w-5 h-5" />}
            iconTone="success"
          />
          <MetricCard
            label="Surface Temp (LST)"
            termId="lst"
            value={lst != null ? lst.toFixed(1) : "—"}
            unit="°C"
            delta={
              lst != null
                ? {
                    value: lst > 30 ? "Critical deviation" : "Within range",
                    tone: lst > 30 ? "up" : "neutral",
                  }
                : undefined
            }
            icon={<Thermometer className="w-5 h-5" />}
            iconTone="critical"
          />
          <MetricCard
            label="Fuel Moisture (FMC)"
            termId="fmc"
            value={fmc != null ? fmc.toFixed(1) : "—"}
            unit="%"
            delta={
              fmc != null
                ? {
                    value: fmc < 12 ? "Drying acceleration" : "Stable",
                    tone: fmc < 12 ? "up" : "neutral",
                  }
                : undefined
            }
            icon={<Droplet className="w-5 h-5" />}
            iconTone="warning"
          />
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <HistoricalVsPredicted />
          <ProjectionWarning />
        </div>
        <div className="col-span-12 lg:col-span-7">
          <SectorMappingContext />
        </div>

        <div className="col-span-12">
          <RiskHeatmapCalendar />
        </div>

        <div className="col-span-12">
          <YearOverYear />
        </div>
      </div>
    </div>
  );
}
