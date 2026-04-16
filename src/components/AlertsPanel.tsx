"use client";

import { alerts, RISK_COLORS } from "@/lib/mock-data";
import { AlertTriangle, Flame, Wind, Sun } from "lucide-react";

const ALERT_ICONS = {
  heat: Sun,
  wind: Wind,
  fire: Flame,
  drought: AlertTriangle,
};

export default function AlertsPanel() {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Active Alerts ({alerts.length})
      </h3>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {alerts.map((alert) => {
          const Icon = ALERT_ICONS[alert.type];
          return (
            <div
              key={alert.id}
              className="flex gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50"
            >
              <div
                className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${RISK_COLORS[alert.severity]}20`,
                }}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: RISK_COLORS[alert.severity] }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {alert.title}
                  </span>
                  <span
                    className="flex-shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${RISK_COLORS[alert.severity]}20`,
                      color: RISK_COLORS[alert.severity],
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {alert.description}
                </p>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
