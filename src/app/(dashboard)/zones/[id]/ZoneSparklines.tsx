"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import Sparkline from "@/components/charts/Sparkline";
import MetricInfo from "@/components/ui/MetricInfo";
import { Skeleton } from "@/components/ui/Skeleton";

interface NdviPoint {
  ts: string;
  ndvi: number | null;
  ndmi: number | null;
}

interface NdviResponse {
  zoneId: string;
  series: NdviPoint[];
  persistent: boolean;
  summary: {
    latest: NdviPoint;
    ndviTrend4w: number | null;
    ndmiTrend4w: number | null;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function deltaLabel(d: number | null): string {
  if (d == null) return "—";
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(2)} 4 wk`;
}

export default function ZoneSparklines({ zoneId }: { zoneId: string }) {
  const { data, isLoading } = useSWR<NdviResponse>(
    `/api/zones/${zoneId}/ndvi-history`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
    );
  }

  const ndviSeries = data?.series.map((p) => p.ndvi) ?? [];
  const ndmiSeries = data?.series.map((p) => p.ndmi) ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      <Card variant="elevated" className="p-4">
        <div className="flex items-baseline justify-between">
          <div className="section-label inline-flex items-center gap-1">
            NDVI · 36 weeks
            <MetricInfo termId="ndvi" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            {deltaLabel(data?.summary.ndviTrend4w ?? null)}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-2xl font-bold tabular">
            {data?.summary.latest.ndvi?.toFixed(2) ?? "—"}
          </span>
        </div>
        <div className="mt-2">
          <Sparkline values={ndviSeries} width={400} height={50} baseline={0.45} />
        </div>
        {data && !data.persistent && (
          <p className="mt-2 text-[10.5px] text-[var(--color-fg-subtle)]">
            Synthesised baseline shown — real Sentinel-2 weekly refresh kicks
            in when GitHub Actions runs.
          </p>
        )}
      </Card>

      <Card variant="elevated" className="p-4">
        <div className="flex items-baseline justify-between">
          <div className="section-label inline-flex items-center gap-1">
            NDMI · 36 weeks
            <MetricInfo termId="ndmi" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            {deltaLabel(data?.summary.ndmiTrend4w ?? null)}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-2xl font-bold tabular">
            {data?.summary.latest.ndmi?.toFixed(2) ?? "—"}
          </span>
        </div>
        <div className="mt-2">
          <Sparkline
            values={ndmiSeries}
            width={400}
            height={50}
            stroke="#4a9eff"
            fill="rgba(74,158,255,0.18)"
            baseline={0.3}
          />
        </div>
      </Card>
    </div>
  );
}
