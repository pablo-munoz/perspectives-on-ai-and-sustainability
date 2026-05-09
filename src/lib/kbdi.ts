/**
 * Keetch–Byram Drought Index (KBDI), 1968.
 *
 *   KBDI starts at 0 (saturated soil) at the start of a wet season and
 *   accumulates daily as a function of max temperature and rainfall:
 *
 *     dQ = (800 - Q) * (0.968 * exp(0.0486 * Tmax) - 8.30) * dt
 *          ─────────────────────────────────────────────────
 *                  1 + 10.88 * exp(-0.0441 * R)
 *
 *   where Q is current KBDI, Tmax is daily max in °F, R is annual rainfall
 *   in inches, dt = 1 day.
 *
 *   Net effective rainfall reduces Q by R_eff (after the first 0.20" of
 *   continuous rain).
 *
 * Inputs accept SI; we convert internally. Returns metric (0-800).
 */

const ANNUAL_RAIN_DEFAULT_MM = 1100; // approx Ourense average

export interface KbdiInputs {
  tempCmax: number;
  rainMm: number; // 24h precipitation
}

export interface KbdiState {
  q: number;
  /** Cumulative rain in current rain event (mm). */
  rainEventMm: number;
}

export const DEFAULT_KBDI_STATE: KbdiState = { q: 100, rainEventMm: 0 };

export function nextKBDI(
  prev: KbdiState,
  i: KbdiInputs,
  annualRainMm: number = ANNUAL_RAIN_DEFAULT_MM
): KbdiState {
  const tF = i.tempCmax * 1.8 + 32;
  const annualIn = annualRainMm / 25.4;

  // Net effective rainfall after the first 0.20" of a continuous rain event.
  let rainEventMm = prev.rainEventMm;
  let netRainMm = 0;
  if (i.rainMm > 0) {
    rainEventMm += i.rainMm;
    const eventIn = rainEventMm / 25.4;
    if (eventIn > 0.2) {
      netRainMm = (eventIn - 0.2) * 25.4;
      // Once we've credited the .20" threshold, subsequent rain in the same
      // event counts fully.
    }
  } else {
    rainEventMm = 0;
  }

  // Reduce Q by net rainfall (in inches × 100 in original formulation).
  let q = Math.max(0, prev.q - (netRainMm / 25.4) * 100);

  // Daily drought factor.
  const num =
    (800 - q) * (0.968 * Math.exp(0.0486 * tF) - 8.3);
  const denom = 1 + 10.88 * Math.exp(-0.0441 * annualIn);
  const dQ = (num / denom) * 0.001;
  q = Math.min(800, Math.max(0, q + dQ));

  return { q, rainEventMm };
}

export function classifyKBDI(q: number): {
  label: string;
  tone: "low" | "moderate" | "high" | "critical";
} {
  if (q < 200) return { label: "Wet", tone: "low" };
  if (q < 400) return { label: "Drying", tone: "moderate" };
  if (q < 600) return { label: "Drought", tone: "high" };
  return { label: "Severe drought", tone: "critical" };
}
