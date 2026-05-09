"use client";

import { Card } from "@/components/ui/Card";
import useSWR from "swr";
import { Activity } from "lucide-react";

interface SourceStatus {
  id: string;
  name: string;
  description: string;
  status: "fresh" | "stale" | "down";
  lastUpdated: string | null;
  expectedEvery: string;
  agedMs: number | null;
}

interface StatusResponse {
  fetchedAt: string;
  persistent: boolean;
  sources: SourceStatus[];
}

const STATUS_LABEL: Record<SourceStatus["status"], string> = {
  fresh: "Al día",
  stale: "Con retraso",
  down: "Sin conexión",
};

const STATUS_COLOR: Record<SourceStatus["status"], string> = {
  fresh: "var(--color-success)",
  stale: "var(--color-warning)",
  down: "var(--color-critical)",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ageLabel(ms: number | null): string {
  if (ms == null) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export default function StatusPage() {
  const { data, isLoading } = useSWR<StatusResponse>("/api/status", fetcher, {
    refreshInterval: 60_000,
  });

  const sources = data?.sources ?? [];
  const fresh = sources.filter((s) => s.status === "fresh").length;
  const total = sources.length;
  const allFresh = total > 0 && fresh === total;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[860px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Health</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Data source status
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Live status of every external feed Fire-See depends on. When a
          source goes <strong>stale</strong> we keep showing the last known
          good value and label it accordingly — Fire-See never silently
          serves blank data.
        </p>
      </header>

      <Card variant="elevated" className="p-5 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="section-label">Overall</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {isLoading
                ? "Checking…"
                : allFresh
                ? "All systems operational"
                : `${fresh} of ${total} fresh`}
            </div>
            <div className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
              Last refreshed {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString("es-ES") : "—"}
            </div>
          </div>
          <div
            className="h-10 w-10 rounded-md flex items-center justify-center"
            style={{
              background: allFresh
                ? "color-mix(in srgb, var(--color-success) 18%, transparent)"
                : "color-mix(in srgb, var(--color-warning) 18%, transparent)",
              color: allFresh
                ? "var(--color-success)"
                : "var(--color-warning)",
            }}
          >
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </Card>

      <ul className="space-y-3">
        {isLoading && sources.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-[72px] rounded-md border border-[var(--color-border)] bg-white/[0.03] animate-pulse"
              />
            ))
          : sources.map((s) => (
              <li key={s.id}>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          background: STATUS_COLOR[s.status],
                          boxShadow:
                            s.status === "fresh"
                              ? `0 0 8px ${STATUS_COLOR[s.status]}`
                              : "none",
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px]">
                          {s.name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">
                          {s.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className="text-[11px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: STATUS_COLOR[s.status] }}
                      >
                        {STATUS_LABEL[s.status]}
                      </div>
                      <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                        {ageLabel(s.agedMs)} · expected {s.expectedEvery}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
      </ul>

      <p className="mt-6 text-[11px] text-[var(--color-fg-subtle)]">
        Fire-See is honest about its data: <strong>fresh</strong> = within the
        expected refresh window. <strong>Con retraso</strong> = up to 5×
        beyond cadence; values are stale but still informative.{" "}
        <strong>Sin conexión</strong> = source unreachable; the dashboard
        keeps the last good cache and tells you so.
      </p>
    </div>
  );
}
