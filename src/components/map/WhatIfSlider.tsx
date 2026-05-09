"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useWeather, useFwi } from "@/lib/hooks";
import {
  classifyFWI,
  computeBUI,
  computeFWI,
  computeISI,
  DEFAULT_STATE,
  FWI_CLASS_LABEL,
  nextDC,
  nextDMC,
  nextFFMC,
  TONE_COLOR_BY_CLASS,
  type FwiClass,
} from "@/lib/fwi";
import MetricInfo from "@/components/ui/MetricInfo";
import { Sparkles } from "lucide-react";

interface Adjustments {
  dT: number; // °C
  dRH: number; // pp
  dWind: number; // km/h
  dPrecip: number; // mm
}

const DEFAULT_ADJ: Adjustments = { dT: 0, dRH: 0, dWind: 0, dPrecip: 0 };

export default function WhatIfSlider() {
  const { weather } = useWeather();
  const { fwi } = useFwi();
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [open, setOpen] = useState(false);

  const baseline = useMemo(() => {
    if (!fwi) return null;
    return {
      ffmc: fwi.current.ffmc,
      dmc: fwi.current.dmc,
      dc: fwi.current.dc,
      isi: fwi.current.isi,
      bui: fwi.current.bui,
      fwi: fwi.current.fwi,
      cls: classifyFWI(fwi.current.fwi),
    };
  }, [fwi]);

  const adjusted = useMemo(() => {
    if (!fwi || !weather) return null;
    const T =
      (weather.temperature ?? 18) + adj.dT;
    const H = Math.max(1, Math.min(100, (weather.humidity ?? 50) + adj.dRH));
    const W = Math.max(0, (weather.windSpeed ?? 5) + adj.dWind);
    const P = Math.max(0, (weather.precipitation ?? 0) + adj.dPrecip);
    const month = new Date().getUTCMonth();

    // Run a one-day forward step from the previous-day persisted state so
    // FFMC/DMC/DC are advanced from the same starting point.
    const prevState = DEFAULT_STATE;
    const ffmc = nextFFMC(prevState.ffmc, {
      tempC: T,
      humidityPct: H,
      windKph: W,
      precipMm: P,
      month,
    });
    const dmc = nextDMC(prevState.dmc, {
      tempC: T,
      humidityPct: H,
      windKph: W,
      precipMm: P,
      month,
    });
    const dc = nextDC(prevState.dc, {
      tempC: T,
      humidityPct: H,
      windKph: W,
      precipMm: P,
      month,
    });
    const isi = computeISI(ffmc, W);
    const bui = computeBUI(dmc, dc);
    const f = computeFWI(isi, bui);
    return { ffmc, dmc, dc, isi, bui, fwi: f, cls: classifyFWI(f) };
  }, [fwi, weather, adj]);

  if (!fwi || !weather) return null;

  return (
    <div className="pointer-events-auto">
      <Card variant="glass" className={open ? "w-[320px] p-4" : "p-2"}>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)] hover:text-[var(--color-accent-hi)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            What-if
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="section-label inline-flex items-center gap-1">
                What-if scenario
                <MetricInfo termId="fwi" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setAdj(DEFAULT_ADJ);
                }}
                aria-label="Close"
                className="text-[var(--color-fg-muted)] text-[10px] uppercase tracking-[0.14em] hover:text-[var(--color-fg)]"
              >
                Reset
              </button>
            </div>

            <p className="mt-2 text-[10.5px] text-[var(--color-fg-muted)] leading-snug">
              Bend the current weather and watch the FWI react. Useful for
              demos and "what would happen if a heat wave hits?" questions.
            </p>

            <div className="mt-3 space-y-3">
              <SliderRow
                label="Temp"
                unit="°C"
                value={adj.dT}
                onChange={(v) => setAdj((a) => ({ ...a, dT: v }))}
                min={-10}
                max={15}
                step={1}
              />
              <SliderRow
                label="Humidity"
                unit="pp"
                value={adj.dRH}
                onChange={(v) => setAdj((a) => ({ ...a, dRH: v }))}
                min={-30}
                max={30}
                step={1}
              />
              <SliderRow
                label="Wind"
                unit="km/h"
                value={adj.dWind}
                onChange={(v) => setAdj((a) => ({ ...a, dWind: v }))}
                min={-20}
                max={40}
                step={1}
              />
              <SliderRow
                label="Rain"
                unit="mm"
                value={adj.dPrecip}
                onChange={(v) => setAdj((a) => ({ ...a, dPrecip: v }))}
                min={0}
                max={40}
                step={1}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
              <Stat
                label="Baseline FWI"
                value={baseline ? baseline.fwi.toFixed(1) : "—"}
                cls={baseline?.cls}
              />
              <Stat
                label="Adjusted FWI"
                value={adjusted ? adjusted.fwi.toFixed(1) : "—"}
                cls={adjusted?.cls}
                emphasis
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function SliderRow({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        <span>{label}</span>
        <span className="tabular text-[var(--color-fg)]">
          {value > 0 ? "+" : ""}
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  cls,
  emphasis,
}: {
  label: string;
  value: string;
  cls?: FwiClass;
  emphasis?: boolean;
}) {
  const color = cls ? TONE_COLOR_BY_CLASS[cls] : "var(--color-fg-muted)";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div
        className={`mt-1 font-display ${
          emphasis ? "text-2xl" : "text-xl"
        } font-bold tabular`}
        style={{ color }}
      >
        {value}
      </div>
      {cls && (
        <div className="text-[9px] uppercase tracking-[0.12em]" style={{ color }}>
          {FWI_CLASS_LABEL[cls]}
        </div>
      )}
    </div>
  );
}
