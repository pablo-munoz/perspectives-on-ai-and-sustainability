"use client";

import { Card } from "@/components/ui/Card";
import { useWeather } from "@/lib/hooks";
import { Wind, ArrowUpRight } from "lucide-react";

export default function WeatherContextFloat() {
  const { weather, isLoading, error } = useWeather();
  const stale = weather?.source === "Unavailable";

  return (
    <Card variant="glass" className="w-[300px] p-4">
      <div className="flex items-center justify-between">
        <div className="section-label">Weather Context</div>
        {(error || stale) && (
          <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-warning)]">
            AEMET stale
          </span>
        )}
        {isLoading && !weather && (
          <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            loading…
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Temp
          </div>
          <div className="mt-1 font-display text-3xl font-semibold tabular">
            {weather?.temperature != null
              ? weather.temperature.toFixed(0)
              : "—"}
            <span className="text-base text-[var(--color-fg-muted)]">°C</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Humidity
          </div>
          <div className="mt-1 font-display text-3xl font-semibold tabular text-[var(--color-success)]">
            {weather?.humidity != null
              ? weather.humidity.toFixed(0)
              : "—"}
            <span className="text-base text-[var(--color-success)]">%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-white/5 flex items-center justify-center text-[var(--color-fg-muted)]">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
              Wind Speed
            </div>
            <div className="text-sm font-semibold tabular">
              {weather?.windSpeed != null
                ? `${weather.windSpeed.toFixed(0)} km/h`
                : "— km/h"}{" "}
              <span className="text-[var(--color-fg-muted)]">
                {weather?.windDirection ?? ""}
              </span>
            </div>
          </div>
        </div>
        <ArrowUpRight className="w-5 h-5 text-[var(--color-accent)]" />
      </div>
    </Card>
  );
}
