"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Maximize2 } from "lucide-react";

const MapboxMap = dynamic(() => import("@/components/map/MapboxMap"), {
  ssr: false,
});

export default function SectorMappingContext() {
  return (
    <Card variant="elevated" className="p-0 overflow-hidden h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="section-label">Sector Mapping Context</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-6 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)] font-semibold">
            <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
            Anomaly Detected
          </span>
          <button className="h-7 w-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[260px] relative">
        <MapboxMap />
      </div>
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-4 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-critical)]" />
          High-risk perimeter
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-success)]" />
          Vegetation buffer
        </span>
      </div>
    </Card>
  );
}
