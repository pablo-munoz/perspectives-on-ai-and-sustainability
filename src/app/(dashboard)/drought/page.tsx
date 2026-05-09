"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import MetricInfo from "@/components/ui/MetricInfo";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DroughtResponse {
  fetchedAt: string;
  kbdi: {
    current: number;
    classification: { label: string; tone: string };
    series: Array<{ date: string; value: number }>;
  };
  spi30: number | null;
  spi90: number | null;
  daysSinceRain: number;
  totalPrecip30d: number;
  totalPrecip90d: number;
  source: string;
}

const TONE_COLOR: Record<string, string> = {
  low: "#fed976",
  moderate: "#feb24c",
  high: "#fd8d3c",
  critical: "#bd0026",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DroughtPage() {
  const { data, isLoading } = useSWR<DroughtResponse>("/api/drought", fetcher, {
    refreshInterval: 60 * 60 * 1000,
  });

  const cls = data?.kbdi.classification;
  const color = cls ? TONE_COLOR[cls.tone] ?? "#fed976" : "#fed976";

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1100px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Long-term context</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Drought monitor
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Drought is the slowest-moving wildfire driver. Fire-See computes
          KBDI daily from ERA5 (Open-Meteo Archive) plus SPI-30 / SPI-90
          anomalies and "days since meaningful rain". When the FWI is stuck
          high for weeks, this page tells you why.
        </p>
      </header>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <BigStat
            label="KBDI"
            termId="kbdi"
            value={data ? `${data.kbdi.current}` : "—"}
            subtitle={cls ? cls.label : ""}
            color={color}
          />
          <BigStat
            label="Days since rain"
            value={data ? `${data.daysSinceRain}` : "—"}
            subtitle={
              data && data.daysSinceRain > 14 ? "Prolonged dry spell" : "Recent"
            }
            color={
              data && data.daysSinceRain > 14
                ? "var(--color-warning)"
                : "var(--color-success)"
            }
          />
          <BigStat
            label="SPI-30"
            termId="spi"
            value={
              data?.spi30 != null ? data.spi30.toFixed(2) : "—"
            }
            subtitle={
              data?.spi30 != null && data.spi30 < -1
                ? "Drier than normal"
                : "Near normal"
            }
            color={
              data?.spi30 != null && data.spi30 < -1
                ? "var(--color-warning)"
                : "var(--color-success)"
            }
          />
          <BigStat
            label="SPI-90"
            termId="spi"
            value={
              data?.spi90 != null ? data.spi90.toFixed(2) : "—"
            }
            subtitle={
              data?.spi90 != null && data.spi90 < -1
                ? "Drier than normal"
                : "Near normal"
            }
            color={
              data?.spi90 != null && data.spi90 < -1
                ? "var(--color-warning)"
                : "var(--color-success)"
            }
          />
        </div>
      )}

      <Card variant="elevated" className="p-5 mb-5">
        <div className="flex items-baseline justify-between">
          <div className="section-label inline-flex items-center gap-1">
            KBDI · last 90 days
            <MetricInfo termId="kbdi" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            {data?.source ?? "—"}
          </div>
        </div>
        <div className="mt-3 h-[260px] -mx-2">
          {isLoading && !data ? (
            <Skeleton className="h-full mx-2" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.kbdi.series ?? []}
                margin={{ top: 5, right: 12, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="kbdi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fd8d3c" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#fd8d3c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#6b6b6b" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={36}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b6b6b" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 800]}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                  contentStyle={{
                    background: "#131418",
                    border: "1px solid #232529",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [`${v}`, "KBDI"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fd8d3c"
                  strokeWidth={1.6}
                  fill="url(#kbdi)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card variant="elevated" className="p-4">
          <div className="section-label">30-day precipitation</div>
          <div className="mt-2 font-display text-3xl font-bold tabular">
            {data?.totalPrecip30d ?? "—"}{" "}
            <span className="text-base text-[var(--color-fg-muted)]">mm</span>
          </div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="section-label">90-day precipitation</div>
          <div className="mt-2 font-display text-3xl font-bold tabular">
            {data?.totalPrecip90d ?? "—"}{" "}
            <span className="text-base text-[var(--color-fg-muted)]">mm</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BigStat({
  label,
  termId,
  value,
  subtitle,
  color,
}: {
  label: string;
  termId?: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Card variant="elevated" className="p-4">
      <div className="section-label inline-flex items-center gap-1">
        {label}
        {termId && <MetricInfo termId={termId} />}
      </div>
      <div
        className="mt-2 font-display text-3xl font-bold tabular"
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        {subtitle}
      </div>
    </Card>
  );
}
