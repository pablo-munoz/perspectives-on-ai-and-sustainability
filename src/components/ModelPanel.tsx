"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Target, BarChart3 } from "lucide-react";

interface ModelData {
  model: {
    model: string;
    accuracy: number;
    kappa: number;
    featureImportance: Record<string, number>;
    trainingPeriod: string;
  };
  zones: Array<{
    zoneId: string;
    zoneName: string;
    baseScore: number;
    weatherModifier: number;
    dynamicScore: number;
    riskLevel: string;
    modifiersApplied: string[];
  }>;
  weather: { temperature: number; humidity: number; windSpeed: number; source: string } | null;
}

export default function ModelPanel() {
  const [data, setData] = useState<ModelData | null>(null);

  useEffect(() => {
    fetch("/api/risk")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
        <div className="text-xs text-slate-500 animate-pulse">Loading ML model data...</div>
      </div>
    );
  }

  const { model } = data;
  const maxImportance = Math.max(...Object.values(model.featureImportance));

  const FEATURE_LABELS: Record<string, string> = {
    NDVI: "Vegetation (NDVI)",
    LST: "Temperature (LST)",
    slope: "Slope",
    NDMI: "Moisture (NDMI)",
    elevation: "Elevation",
    dist_roads: "Distance to roads",
    aspect: "Aspect",
    dist_urban: "Distance to urban",
  };

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
        <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
        ML Model
      </h3>

      {/* Model stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-sm font-bold text-purple-400">{model.model}</div>
          <div className="text-[9px] text-slate-500">Algorithm</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-emerald-400">
            {(model.accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-500">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-blue-400">
            {model.kappa.toFixed(3)}
          </div>
          <div className="text-[9px] text-slate-500">Kappa</div>
        </div>
      </div>

      {/* Feature importance */}
      <div className="mb-2">
        <div className="flex items-center gap-1 mb-2">
          <BarChart3 className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            Feature Importance
          </span>
        </div>
        <div className="space-y-1.5">
          {Object.entries(model.featureImportance)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([feature, importance]) => (
              <div key={feature}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-400">
                    {FEATURE_LABELS[feature] || feature}
                  </span>
                  <span className="text-slate-500">{importance.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/70"
                    style={{
                      width: `${(importance / maxImportance) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Dynamic scoring status */}
      {data.weather && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-1 mb-1.5">
            <Target className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">
              Dynamic Modifiers Active
            </span>
          </div>
          {data.zones[0]?.modifiersApplied.length > 0 ? (
            <div className="space-y-0.5">
              {data.zones[0].modifiersApplied.map((mod, i) => (
                <div key={i} className="text-[10px] text-amber-400/80">
                  + {mod}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">
              No weather modifiers active
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-[9px] text-slate-600">
        Trained on {model.trainingPeriod} fire data
      </div>
    </div>
  );
}
