"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolbarChip } from "@/components/ui/Toolbar";
import { AlertListItem } from "@/components/alerts/AlertListItem";
import { AlertDetail } from "@/components/alerts/AlertDetail";
import { useAlerts, useFirms } from "@/lib/hooks";
import type { DerivedAlert } from "@/lib/hooks";
import { Filter, ArrowDownUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ARCHIVED_DEMO: DerivedAlert = {
  id: "archived-zone1",
  type: "fire",
  severity: "low",
  title: "Containment Success: Zone 1",
  description: "Sector Alpha resolved 12:42 UTC.",
  timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
};

export default function AlertsPage() {
  const { alerts } = useAlerts();
  const { firms } = useFirms();
  const list = useMemo(() => alerts?.alerts ?? [], [alerts]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedId) return;
    if (list.length) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const selected = list.find((a) => a.id === selectedId) ?? list[0];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1500px] mx-auto">
      <SectionHeading
        title="Alerts & Dispatch"
        subtitle="Active incidents and response telemetry"
      />

      <div className="mt-6 flex items-center gap-2">
        <ToolbarChip active icon={<Filter className="w-3 h-3" />}>
          Severity All
        </ToolbarChip>
        <ToolbarChip active icon={<ArrowDownUp className="w-3 h-3" />}>
          Newest First
        </ToolbarChip>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5 min-w-0">
          {list.length === 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-fg-muted)] text-sm">
              No active alerts. All conditions within normal range.
            </div>
          )}
          {list.map((a, i) => (
            <AlertListItem
              key={a.id}
              alert={a}
              active={selectedId === a.id}
              coords={
                firms?.hotspots?.[i % Math.max(1, firms.hotspots.length)] && {
                  lat: firms.hotspots[i % firms.hotspots.length].lat,
                  lng: firms.hotspots[i % firms.hotspots.length].lng,
                }
              }
              onClick={() => setSelectedId(a.id)}
            />
          ))}
          <AlertListItem alert={ARCHIVED_DEMO} archived />
        </div>

        <div className="lg:col-span-7 min-w-0">
          {selected ? (
            <AlertDetail
              alert={selected}
              onDismiss={() => {
                const idx = list.findIndex((a) => a.id === selected.id);
                const next = list[idx + 1] ?? list[idx - 1];
                setSelectedId(next?.id ?? null);
              }}
            />
          ) : (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-fg-muted)] text-sm">
              Select an alert to inspect telemetry and dispatch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
