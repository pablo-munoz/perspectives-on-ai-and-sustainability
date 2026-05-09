"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import { useAlerts, useRisk } from "@/lib/hooks";
import { StatusPill } from "@/components/ui/StatusPill";
import { useEffect, useMemo, useState } from "react";
import { useMobileNav } from "./MobileNavContext";
import ThemeToggle from "./ThemeToggle";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/map": {
    title: "Fire-See Intelligence",
    subtitle: "Real-time wildfire surveillance — Ourense sector",
  },
  "/analytics": {
    title: "Environmental Analytics",
    subtitle: "Predictive risk modelling — System active",
  },
  "/zones": {
    title: "Zones Management",
    subtitle: "Geospatial intelligence & risk perimeter monitoring",
  },
  "/alerts": {
    title: "Alerts & Dispatch",
    subtitle: "Active incidents and response telemetry",
  },
  "/settings": { title: "Settings", subtitle: "Workspace preferences" },
  "/support": { title: "Support", subtitle: "Help & documentation" },
  "/methodology": {
    title: "Methodology",
    subtitle: "Data sources, model card and limitations",
  },
  "/glossary": {
    title: "Glossary",
    subtitle: "Definitions for every technical term",
  },
  "/data": {
    title: "Open Data",
    subtitle: "Public datasets and API endpoints",
  },
  "/status": {
    title: "Data Source Status",
    subtitle: "Live health of every external feed",
  },
  "/incidents": {
    title: "Incidents",
    subtitle: "Live FIRMS detections clustered into incident objects",
  },
  "/drought": {
    title: "Drought Monitor",
    subtitle: "KBDI · SPI · days-since-rain · Open-Meteo Archive",
  },
  "/air": {
    title: "Air Quality",
    subtitle: "PM2.5 · PM10 · European AQI · Copernicus CAMS",
  },
  "/press": {
    title: "Press Kit",
    subtitle: "Embeds, OG cards, RSS, iCal, downloads — CC-BY-4.0",
  },
  "/burn-severity": {
    title: "Burn Severity",
    subtitle: "Sentinel-2 NBR / dNBR methodology",
  },
  "/changelog": {
    title: "Changelog",
    subtitle: "What shipped and when",
  },
};

function useCurrentTitle() {
  const pathname = usePathname() ?? "/map";
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k));
  return TITLES[key ?? "/map"];
}

export default function TopBar() {
  const { title } = useCurrentTitle();
  const { risk } = useRisk();
  const { alerts } = useAlerts();
  const { toggle } = useMobileNav();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    setNow(new Date());
    return () => clearInterval(id);
  }, []);

  const peakZone = useMemo(() => {
    const zones = risk?.zones ?? [];
    if (!zones.length) return null;
    return [...zones].sort((a, b) => b.dynamicScore - a.dynamicScore)[0];
  }, [risk]);

  const criticalCount =
    alerts?.alerts?.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <header className="h-16 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center px-4 md:px-6 gap-3 md:gap-6">
      <button
        type="button"
        onClick={toggle}
        aria-label="Open navigation"
        className="md:hidden h-9 w-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] flex items-center justify-center"
      >
        <Menu className="w-4 h-4" />
      </button>

      <h1 className="font-display text-base md:text-lg font-semibold tracking-tight text-[var(--color-fg)] truncate">
        {title}
      </h1>

      <div className="flex-1 max-w-md mx-auto hidden md:block">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-subtle)]">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search coordinates or zones..."
            className="bg-transparent text-[12px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none w-full"
          />
          {now && (
            <span className="text-[10px] tabular text-[var(--color-fg-subtle)] font-mono whitespace-nowrap">
              {now.toUTCString().slice(17, 22)} UTC
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {peakZone && peakZone.riskLevel === "critical" && (
          <StatusPill tone="critical" pulse>
            Critical Threat: {peakZone.zoneName.split(" ")[0]}
          </StatusPill>
        )}
        {peakZone && peakZone.riskLevel !== "critical" && (
          <StatusPill tone="synced">Data Synced</StatusPill>
        )}

        <ThemeToggle />

        <button
          className="relative h-9 w-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] flex items-center justify-center transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--color-critical)] text-white text-[9px] font-bold flex items-center justify-center">
              {criticalCount}
            </span>
          )}
        </button>

        <button
          className="h-9 w-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] flex items-center justify-center transition-colors"
          aria-label="Profile"
        >
          <UserCircle2 className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
