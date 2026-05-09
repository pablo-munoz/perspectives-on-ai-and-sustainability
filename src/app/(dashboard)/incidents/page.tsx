"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { Flame, MapPin, Clock, Thermometer } from "lucide-react";
import { useState, useMemo } from "react";

interface Incident {
  id: string;
  centroid: { lat: number; lng: number };
  detections: number;
  firstDetected: string;
  lastDetected: string;
  agedHours: number;
  status: "active" | "cooling" | "cold";
  peakBrightness: number;
  zoneId: string | null;
  zoneName: string | null;
}

interface IncidentsResponse {
  fetchedAt: string;
  count: number;
  sourceCount: number;
  incidents: Incident[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLOR: Record<Incident["status"], string> = {
  active: "var(--color-critical)",
  cooling: "var(--color-warning)",
  cold: "var(--color-fg-subtle)",
};
const STATUS_LABEL: Record<Incident["status"], string> = {
  active: "Active",
  cooling: "Cooling",
  cold: "Cold",
};

const FILTERS = ["all", "active", "cooling", "cold"] as const;

export default function IncidentsPage() {
  const { data, isLoading } = useSWR<IncidentsResponse>(
    "/api/incidents",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.incidents;
    return data.incidents.filter((i) => i.status === filter);
  }, [data, filter]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Real time</div>
        <h1 className="mt-2 font-display text-3xl font-bold">Incidents</h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          FIRMS VIIRS detections clustered into incident objects (≈ 2 km / 48 h).
          Each incident gets a stable id, status (active / cooling / cold),
          last-detected timestamp and zone of impact. Refreshes every 10
          minutes.
        </p>
      </header>

      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.14em] ${
                filter === f
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {data
            ? `${data.count} incidents · ${data.sourceCount} detections`
            : "—"}
        </div>
      </div>

      {isLoading && !data ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[88px]" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <Card variant="elevated" className="p-6 text-center">
          <Flame className="w-6 h-6 mx-auto text-[var(--color-success)]" />
          <div className="mt-2 font-display text-base font-bold">
            No active incidents
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
            FIRMS reports zero VIIRS thermal anomalies in the Ourense bbox in
            the last 48 hours.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inc) => (
            <li key={inc.id}>
              <Card variant="elevated" className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="mt-1 h-3 w-3 rounded-full shrink-0"
                      style={{
                        background: STATUS_COLOR[inc.status],
                        boxShadow:
                          inc.status === "active"
                            ? `0 0 10px ${STATUS_COLOR[inc.status]}`
                            : "none",
                      }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold">
                        Incident{" "}
                        <span className="text-[var(--color-fg-muted)] font-mono text-[12px]">
                          #{inc.id}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 flex-wrap text-[11.5px] text-[var(--color-fg-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {inc.centroid.lat.toFixed(3)},{" "}
                          {inc.centroid.lng.toFixed(3)}
                        </span>
                        {inc.zoneName && (
                          <Link
                            href={`/zones/${inc.zoneId}`}
                            className="text-[var(--color-accent)] hover:underline"
                          >
                            in {inc.zoneName}
                          </Link>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {inc.detections} detection
                          {inc.detections !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          {inc.peakBrightness} K
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: STATUS_COLOR[inc.status] }}
                    >
                      {STATUS_LABEL[inc.status]}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] inline-flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {inc.agedHours < 1
                        ? `${Math.round(inc.agedHours * 60)} min ago`
                        : `${Math.round(inc.agedHours)} h ago`}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[11px] text-[var(--color-fg-subtle)]">
        Incidents are computed by spatio-temporal DBSCAN over FIRMS hotspots.
        See{" "}
        <Link
          href="/methodology#sources"
          className="text-[var(--color-accent)] hover:underline"
        >
          methodology
        </Link>{" "}
        for the clustering parameters.
      </p>
    </div>
  );
}
