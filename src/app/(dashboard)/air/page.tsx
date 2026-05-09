"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wind } from "lucide-react";

interface AirResponse {
  fetchedAt: string;
  current: {
    pm2_5: number | null;
    pm10: number | null;
    europeanAqi: number | null;
    europeanAqiClass: string;
    co: number | null;
    o3: number | null;
    no2: number | null;
  };
  forecast: Array<{
    ts: string;
    pm2_5: number | null;
    pm10: number | null;
    europeanAqi: number | null;
  }>;
  source: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const AQI_COLOR = (aqi: number | null) => {
  if (aqi == null) return "var(--color-fg-subtle)";
  if (aqi <= 20) return "#5fc77a";
  if (aqi <= 40) return "#fed976";
  if (aqi <= 60) return "#feb24c";
  if (aqi <= 80) return "#fd8d3c";
  if (aqi <= 100) return "#f03b20";
  return "#bd0026";
};

export default function AirPage() {
  const { data, isLoading } = useSWR<AirResponse>("/api/air", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });

  const pm = data?.current.pm2_5 ?? null;
  const aqi = data?.current.europeanAqi ?? null;

  const chart = (data?.forecast ?? [])
    .filter((_, i) => i % 3 === 0)
    .map((p) => ({
      ts: new Date(p.ts).toLocaleString("es-ES", {
        weekday: "short",
        hour: "2-digit",
      }),
      pm2_5: p.pm2_5,
      aqi: p.europeanAqi,
    }));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 max-w-[1100px] mx-auto pb-20">
      <header className="mb-6">
        <div className="section-label">Health</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Air quality &amp; smoke
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] max-w-prose">
          Wildfires generate fine particulate that can travel hundreds of
          kilometres. PM2.5 above 25 µg/m³ is unhealthy for sensitive groups;
          above 75 µg/m³ everyone should reduce outdoor activity. Data from
          Copernicus CAMS via Open-Meteo Air Quality.
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
            label="European AQI"
            value={aqi != null ? String(Math.round(aqi)) : "—"}
            subtitle={data?.current.europeanAqiClass ?? ""}
            color={AQI_COLOR(aqi)}
          />
          <BigStat
            label="PM2.5"
            unit="µg/m³"
            value={pm != null ? pm.toFixed(1) : "—"}
            subtitle={
              pm != null && pm > 75
                ? "Unhealthy"
                : pm != null && pm > 25
                ? "Sensitive groups"
                : "Healthy"
            }
            color={
              pm != null && pm > 75
                ? "#bd0026"
                : pm != null && pm > 25
                ? "#fd8d3c"
                : "#5fc77a"
            }
          />
          <BigStat
            label="PM10"
            unit="µg/m³"
            value={
              data?.current.pm10 != null ? data.current.pm10.toFixed(0) : "—"
            }
            subtitle="dust + coarse particles"
            color="var(--color-fg)"
          />
          <BigStat
            label="O3"
            unit="µg/m³"
            value={data?.current.o3 != null ? data.current.o3.toFixed(0) : "—"}
            subtitle="ground-level ozone"
            color="var(--color-fg)"
          />
        </div>
      )}

      <Card variant="elevated" className="p-5">
        <div className="flex items-baseline justify-between">
          <div className="section-label inline-flex items-center gap-2">
            <Wind className="w-3.5 h-3.5" /> 72-hour PM2.5 forecast
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
                data={chart}
                margin={{ top: 5, right: 12, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="pm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#4a9eff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="ts"
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
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                  contentStyle={{
                    background: "#131418",
                    border: "1px solid #232529",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v) => [
                    typeof v === "number" ? `${v.toFixed(1)} µg/m³` : "—",
                    "PM2.5",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="pm2_5"
                  stroke="#4a9eff"
                  strokeWidth={1.6}
                  fill="url(#pm)"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function BigStat({
  label,
  value,
  unit,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Card variant="elevated" className="p-4">
      <div className="section-label">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold tabular flex items-baseline gap-1.5">
        <span style={{ color }}>{value}</span>
        {unit && (
          <span className="text-sm text-[var(--color-fg-muted)]">{unit}</span>
        )}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        {subtitle}
      </div>
    </Card>
  );
}
