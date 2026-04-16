"use client";

import { useEffect, useState } from "react";
import { weatherData as mockWeather } from "@/lib/mock-data";
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Gauge,
} from "lucide-react";

interface LiveWeather {
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  precipitation: number | null;
  lastUpdated: string;
  source: string;
}

export default function WeatherPanel() {
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [source, setSource] = useState("loading...");

  useEffect(() => {
    fetch("/api/weather")
      .then((res) => res.json())
      .then((data: LiveWeather) => {
        if (data.temperature != null) {
          setWeather(data);
          setSource(data.source);
        } else {
          setSource("Mock data");
        }
      })
      .catch(() => {
        setSource("Mock data");
      });
  }, []);

  const w = weather ?? {
    temperature: mockWeather.temperature,
    humidity: mockWeather.humidity,
    windSpeed: mockWeather.windSpeed,
    windDirection: mockWeather.windDirection,
    precipitation: mockWeather.precipitation,
    lastUpdated: mockWeather.lastUpdated,
  };

  // Compute FWI approximation (simplified)
  const temp = w.temperature ?? 0;
  const hum = w.humidity ?? 50;
  const wind = w.windSpeed ?? 0;
  const fwi = weather
    ? Math.min(50, Math.max(0, (temp * 0.8) + (wind * 0.4) - (hum * 0.3) + 10))
    : mockWeather.fwi;

  const fwiColor =
    fwi > 30 ? "#ef4444" : fwi > 20 ? "#f97316" : fwi > 10 ? "#eab308" : "#22c55e";
  const fwiLabel =
    fwi > 30 ? "Extreme" : fwi > 20 ? "High" : fwi > 10 ? "Moderate" : "Low";

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Weather — Ourense
        </h3>
        <span className="text-[9px] text-slate-500">{source}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-400" />
          <div>
            <div className="text-lg font-bold text-white">
              {w.temperature != null ? `${Math.round(w.temperature)}°C` : "—"}
            </div>
            <div className="text-[10px] text-slate-500">Temperature</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-lg font-bold text-white">
              {w.humidity != null ? `${Math.round(w.humidity)}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-500">Humidity</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-lg font-bold text-white">
              {w.windSpeed != null ? (
                <>{w.windSpeed} <span className="text-xs font-normal">km/h</span></>
              ) : "—"}
            </div>
            <div className="text-[10px] text-slate-500">
              Wind {w.windDirection ?? ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-lg font-bold text-white">
              {w.precipitation != null ? (
                <>{w.precipitation} <span className="text-xs font-normal">mm</span></>
              ) : "—"}
            </div>
            <div className="text-[10px] text-slate-500">Rain (24h)</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4" style={{ color: fwiColor }} />
            <span className="text-xs text-slate-400">Fire Weather Index</span>
          </div>
          <span className="text-sm font-bold" style={{ color: fwiColor }}>
            {fwi.toFixed(1)} — {fwiLabel}
          </span>
        </div>
        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((fwi / 50) * 100, 100)}%`,
              backgroundColor: fwiColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
