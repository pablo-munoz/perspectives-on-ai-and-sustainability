"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import MetricInfo from "@/components/ui/MetricInfo";
import {
  classifyFWI,
  TONE_COLOR_BY_CLASS,
  FWI_CLASS_LABEL,
  type FwiClass,
} from "@/lib/fwi";

interface YoyPoint {
  year: number;
  fwi: number;
  fwiClass: string;
  tmax: number | null;
  rh: number | null;
  precip: number | null;
}

interface YoyResponse {
  fetchedAt: string;
  date: string;
  points: YoyPoint[];
  source: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function YearOverYear() {
  const { data, isLoading } = useSWR<YoyResponse>("/api/yoy", fetcher, {
    refreshInterval: 24 * 60 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <Card variant="elevated" className="p-5">
        <div className="section-label">Same week, recent years</div>
        <Skeleton className="mt-3 h-[140px]" />
      </Card>
    );
  }

  const max = Math.max(...data.points.map((p) => p.fwi), 1);

  return (
    <Card variant="elevated" className="p-5">
      <div className="flex items-baseline justify-between">
        <div className="section-label inline-flex items-center gap-1">
          Same week, recent years
          <MetricInfo termId="fwi" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          {data.source}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {data.points.map((p) => {
          const cls = (p.fwiClass as FwiClass) ?? classifyFWI(p.fwi);
          const color = TONE_COLOR_BY_CLASS[cls] ?? "#fed976";
          const height = Math.max(8, Math.round((p.fwi / max) * 100));
          return (
            <div
              key={p.year}
              className="flex flex-col items-center justify-end h-[140px] rounded-md p-2 bg-white/[0.03] border border-[var(--color-border)]"
            >
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                {p.year}
              </div>
              <div
                className="w-full mt-2 rounded-sm transition-all"
                style={{ height: `${height}%`, background: color }}
              />
              <div
                className="mt-2 font-display text-base font-bold tabular"
                style={{ color }}
              >
                {p.fwi.toFixed(1)}
              </div>
              <div className="text-[9px] uppercase tracking-[0.1em]" style={{ color }}>
                {FWI_CLASS_LABEL[cls]}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[var(--color-fg-subtle)]">
        FWI computed for the same calendar date in each year using ERA5
        weather (30-day spin-up). Lower bar = wetter year, higher bar = drier.
      </p>
    </Card>
  );
}
