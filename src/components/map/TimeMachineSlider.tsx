"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RiskLevel } from "@/lib/mock-data";

interface SnapshotZone {
  id: string;
  score: number;
  base: number;
  level: string;
}

interface DetailSample {
  ts: string;
  avg: number;
  peak: number;
  zones: SnapshotZone[];
}

interface DetailResponse {
  range: string;
  samples: number;
  series: DetailSample[];
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

export type ZoneScoreMap = Map<
  string,
  { score: number; level: RiskLevel }
>;

interface Props {
  /** Called whenever the active snapshot changes (null = live mode). */
  onChange: (snapshotZones: ZoneScoreMap | null, ts: string | null) => void;
  /** Called when the user explicitly closes the panel. */
  onClose: () => void;
}

function clampLevel(s: string): RiskLevel {
  if (s === "critical" || s === "high" || s === "medium" || s === "low")
    return s;
  return "low";
}

function fmtTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export default function TimeMachineSlider({ onChange, onClose }: Props) {
  const { data, error, isLoading } = useSWR<DetailResponse>(
    "/api/history?range=30d&detail=full",
    fetcher,
    { revalidateOnFocus: false }
  );

  const series = data?.series ?? [];
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // When data first loads, jump to the latest snapshot.
  useEffect(() => {
    if (series.length > 0) setIdx(series.length - 1);
  }, [series.length]);

  // Notify parent on idx change.
  useEffect(() => {
    if (series.length === 0) {
      onChange(null, null);
      return;
    }
    const sample = series[idx];
    if (!sample) return;
    const map: ZoneScoreMap = new Map();
    for (const z of sample.zones) {
      map.set(z.id, { score: z.score, level: clampLevel(z.level) });
    }
    onChange(map, sample.ts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, series.length]);

  // Reset to live mode on unmount.
  useEffect(() => {
    return () => onChange(null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play/pause loop
  useEffect(() => {
    if (!playing) {
      if (playTimer.current) clearInterval(playTimer.current);
      playTimer.current = null;
      return;
    }
    playTimer.current = setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= series.length) {
          setPlaying(false);
          return i;
        }
        return next;
      });
    }, 350);
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [playing, series.length]);

  const current = useMemo(() => series[idx], [series, idx]);
  const isLatest = idx === series.length - 1;

  return (
    <Card variant="glass" className="p-3 w-full">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={series.length < 2 || isLatest}
            aria-label={playing ? "Pause playback" : "Play playback"}
            className="h-7 w-7 rounded-full bg-[var(--color-accent)] text-black flex items-center justify-center hover:bg-[var(--color-accent-hi)] disabled:opacity-40"
          >
            {playing ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIdx(series.length - 1);
            }}
            disabled={series.length === 0}
            aria-label="Jump to live"
            className="h-7 w-7 rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] flex items-center justify-center hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em]">
            <span className="text-[var(--color-fg-subtle)]">Time machine</span>
            <span className="text-[var(--color-fg-muted)] tabular">
              {error
                ? "history error"
                : isLoading
                ? "loading…"
                : current
                ? fmtTs(current.ts)
                : "no history"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, series.length - 1)}
            step={1}
            value={idx}
            onChange={(e) => {
              setPlaying(false);
              setIdx(parseInt(e.target.value, 10));
            }}
            disabled={series.length < 2}
            aria-label="History timestamp"
            className="mt-1 w-full accent-[var(--color-accent)]"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close time machine"
          className="shrink-0 h-7 w-7 rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] flex items-center justify-center hover:border-[var(--color-critical)] hover:text-[var(--color-critical)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}
