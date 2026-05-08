"use client";

import { Card } from "@/components/ui/Card";
import { Layers, History } from "lucide-react";

export interface MapOverlayState {
  gibs: boolean;
  effis: boolean;
  historicalFires: boolean;
}

interface Props {
  overlays: MapOverlayState;
  onToggle: (key: keyof MapOverlayState) => void;
  timeMachineActive: boolean;
  onToggleTimeMachine: () => void;
}

const TOGGLES: {
  key: keyof MapOverlayState;
  label: string;
  hint: string;
}[] = [
  {
    key: "gibs",
    label: "VIIRS thermal",
    hint: "NASA GIBS · today",
  },
  {
    key: "effis",
    label: "EFFIS FWI",
    hint: "Copernicus · ECMWF",
  },
  {
    key: "historicalFires",
    label: "Historical fires",
    hint: "MITECO · 2010–2024",
  },
];

export default function MapLayersControl({
  overlays,
  onToggle,
  timeMachineActive,
  onToggleTimeMachine,
}: Props) {
  return (
    <Card variant="glass" className="w-[220px] p-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <Layers className="w-3.5 h-3.5 text-[var(--color-fg-muted)]" />
        <span className="section-label text-[10px]">Map layers</span>
      </div>
      <ul className="space-y-1">
        {TOGGLES.map((t) => {
          const active = overlays[t.key];
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onToggle(t.key)}
                aria-pressed={active}
                className={`w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2 ${
                  active
                    ? "bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30"
                    : "border border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <div className="min-w-0">
                  <div
                    className={`text-[12px] font-semibold leading-none ${
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-fg-muted)]"
                    }`}
                  >
                    {t.label}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] truncate">
                    {t.hint}
                  </div>
                </div>
                <span
                  className={`shrink-0 h-3.5 w-7 rounded-full transition-colors relative ${
                    active ? "bg-[var(--color-accent)]" : "bg-white/10"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                      active ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onToggleTimeMachine}
        aria-pressed={timeMachineActive}
        className={`mt-3 w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2 ${
          timeMachineActive
            ? "bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30"
            : "border border-transparent hover:bg-white/[0.03]"
        }`}
      >
        <div className="flex items-center gap-2">
          <History
            className={`w-3.5 h-3.5 ${
              timeMachineActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-fg-muted)]"
            }`}
          />
          <span
            className={`text-[12px] font-semibold ${
              timeMachineActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-fg-muted)]"
            }`}
          >
            Time machine
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          30 d
        </span>
      </button>
    </Card>
  );
}
