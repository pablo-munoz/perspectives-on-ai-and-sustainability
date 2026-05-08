/**
 * Canadian Forest Fire Weather Index System.
 *
 * Implements Van Wagner (1987) "Development and Structure of the Canadian
 * Forest Fire Weather Index System" — the index family adopted by Copernicus
 * EFFIS for all of Europe.
 *
 *   Inputs (daily, taken at noon local time):
 *     T   — temperature (°C)
 *     H   — relative humidity (%)
 *     W   — 10 m wind speed (km/h)
 *     P   — 24 h accumulated precipitation (mm)
 *     mon — calendar month index, 0–11
 *
 *   State carried between days:
 *     ffmc — Fine Fuel Moisture Code
 *     dmc  — Duff Moisture Code
 *     dc   — Drought Code
 *
 *   Derived (closed-form):
 *     ISI  — Initial Spread Index
 *     BUI  — Build-Up Index
 *     FWI  — Fire Weather Index
 *
 * Defaults at fire-season start (Van Wagner): F=85, P=6, D=15. For continuous
 * year-round operation we keep state in KV between cron ticks.
 */

export interface FwiInputs {
  tempC: number;
  humidityPct: number;
  windKph: number;
  precipMm: number;
  month: number; // 0–11
}

export interface FwiState {
  ffmc: number;
  dmc: number;
  dc: number;
}

export interface FwiOutput extends FwiState {
  isi: number;
  bui: number;
  fwi: number;
  fwiClass: FwiClass;
}

export type FwiClass =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high"
  | "extreme";

export const DEFAULT_STATE: FwiState = { ffmc: 85, dmc: 6, dc: 15 };

const DMC_DAY_LENGTH = [
  6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0,
];

const DC_DAY_LENGTH = [
  -1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6,
];

export function nextFFMC(prev: number, i: FwiInputs): number {
  const { tempC: T, humidityPct: H, windKph: W, precipMm: P } = i;
  let mo = (147.2 * (101 - prev)) / (59.5 + prev);

  if (P > 0.5) {
    const rf = P - 0.5;
    if (mo > 150) {
      mo +=
        42.5 *
          rf *
          Math.exp(-100 / (251 - mo)) *
          (1 - Math.exp(-6.93 / rf)) +
        0.0015 * (mo - 150) ** 2 * Math.sqrt(rf);
    } else {
      mo +=
        42.5 *
        rf *
        Math.exp(-100 / (251 - mo)) *
        (1 - Math.exp(-6.93 / rf));
    }
    if (mo > 250) mo = 250;
  }

  const ed =
    0.942 * H ** 0.679 +
    11 * Math.exp((H - 100) / 10) +
    0.18 * (21.1 - T) * (1 - Math.exp(-0.115 * H));
  const ew =
    0.618 * H ** 0.753 +
    10 * Math.exp((H - 100) / 10) +
    0.18 * (21.1 - T) * (1 - Math.exp(-0.115 * H));

  let m: number;
  if (mo > ed) {
    const ko =
      0.424 * (1 - (H / 100) ** 1.7) +
      0.0694 * Math.sqrt(W) * (1 - (H / 100) ** 8);
    const kd = ko * 0.581 * Math.exp(0.0365 * T);
    m = ed + (mo - ed) * Math.pow(10, -kd);
  } else if (mo < ed && mo < ew) {
    const kl =
      0.424 * (1 - ((100 - H) / 100) ** 1.7) +
      0.0694 * Math.sqrt(W) * (1 - ((100 - H) / 100) ** 8);
    const kw = kl * 0.581 * Math.exp(0.0365 * T);
    m = ew - (ew - mo) * Math.pow(10, -kw);
  } else {
    m = mo;
  }

  const F = (59.5 * (250 - m)) / (147.2 + m);
  return Math.max(0, Math.min(101, F));
}

export function nextDMC(prev: number, i: FwiInputs): number {
  const { tempC: T, humidityPct: H, precipMm: P, month } = i;
  const Le = DMC_DAY_LENGTH[month] ?? 9;

  let p = prev;
  if (P > 1.5) {
    const re = 0.92 * P - 1.27;
    const Mo = 20 + Math.exp(5.6348 - prev / 43.43);
    let b: number;
    if (prev <= 33) b = 100 / (0.5 + 0.3 * prev);
    else if (prev <= 65) b = 14 - 1.3 * Math.log(prev);
    else b = 6.2 * Math.log(prev) - 17.2;
    const Mr = Mo + (1000 * re) / (48.77 + b * re);
    const Pr = 244.72 - 43.43 * Math.log(Mr - 20);
    p = Math.max(0, Pr);
  }

  const Tk = T < -1.1 ? -1.1 : T;
  const K = 1.894 * (Tk + 1.1) * (100 - H) * Le * 1e-6;

  return Math.max(0, p + 100 * K);
}

export function nextDC(prev: number, i: FwiInputs): number {
  const { tempC: T, precipMm: P, month } = i;
  const Lf = DC_DAY_LENGTH[month] ?? 1.6;

  let d = prev;
  if (P > 2.8) {
    const rd = 0.83 * P - 1.27;
    const Q0 = 800 * Math.exp(-prev / 400);
    const Qr = Q0 + 3.937 * rd;
    const Dr = 400 * Math.log(800 / Qr);
    d = Math.max(0, Dr);
  }

  const Tk = T < -2.8 ? -2.8 : T;
  const V = Math.max(0, 0.36 * (Tk + 2.8) + Lf);

  return d + 0.5 * V;
}

export function computeISI(ffmc: number, windKph: number): number {
  const m = (147.2 * (101 - ffmc)) / (59.5 + ffmc);
  const fW = Math.exp(0.05039 * windKph);
  const fF = 91.9 * Math.exp(-0.1386 * m) * (1 + m ** 5.31 / 4.93e7);
  return 0.208 * fW * fF;
}

export function computeBUI(dmc: number, dc: number): number {
  if (dmc === 0 && dc === 0) return 0;
  if (dmc <= 0.4 * dc) {
    return Math.max(0, (0.8 * dmc * dc) / (dmc + 0.4 * dc));
  }
  return Math.max(
    0,
    dmc - (1 - (0.8 * dc) / (dmc + 0.4 * dc)) * (0.92 + (0.0114 * dmc) ** 1.7)
  );
}

export function computeFWI(isi: number, bui: number): number {
  const fD =
    bui <= 80
      ? 0.626 * bui ** 0.809 + 2
      : 1000 / (25 + 108.64 * Math.exp(-0.023 * bui));
  const B = 0.1 * isi * fD;
  if (B <= 1) return B;
  return Math.exp(2.72 * Math.pow(0.434 * Math.log(B), 0.647));
}

/**
 * EFFIS-aligned classification thresholds. EFFIS publishes:
 *   Very Low <5.2 · Low 5.2–11.2 · Moderate 11.2–21.3 ·
 *   High 21.3–38.0 · Very High 38.0–50.0 · Extreme >=50
 */
export function classifyFWI(fwi: number): FwiClass {
  if (fwi < 5.2) return "very-low";
  if (fwi < 11.2) return "low";
  if (fwi < 21.3) return "moderate";
  if (fwi < 38) return "high";
  if (fwi < 50) return "very-high";
  return "extreme";
}

export function advanceDay(state: FwiState, i: FwiInputs): FwiOutput {
  const ffmc = nextFFMC(state.ffmc, i);
  const dmc = nextDMC(state.dmc, i);
  const dc = nextDC(state.dc, i);
  const isi = computeISI(ffmc, i.windKph);
  const bui = computeBUI(dmc, dc);
  const fwi = computeFWI(isi, bui);
  return { ffmc, dmc, dc, isi, bui, fwi, fwiClass: classifyFWI(fwi) };
}

export const FWI_CLASS_LABEL: Record<FwiClass, string> = {
  "very-low": "Very Low",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very High",
  extreme: "Extreme",
};

export interface FwiDay {
  date: string;
  ffmc: number;
  dmc: number;
  dc: number;
  isi: number;
  bui: number;
  fwi: number;
  fwiClass: FwiClass | string;
}

export interface FwiResponse {
  current: FwiDay;
  forecast: FwiDay[];
  source: string;
  fetchedAt: string;
}
