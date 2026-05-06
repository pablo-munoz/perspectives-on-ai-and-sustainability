/**
 * Dead Fuel Moisture Content (FMC).
 *
 * Implements Simard's (1968) Equilibrium Moisture Content formula — the same
 * one used by NWCG (US National Wildfire Coordinating Group) for 1-hour fuels.
 * Adjusts for recent precipitation (saturated fuels).
 *
 * 1-hour fuels are <0.6 cm diameter (grass, leaves, needles): they respond
 * almost instantly to ambient temp/humidity, so EMC ≈ FMC for our purposes.
 *
 * References:
 *   Simard, A.J. (1968). "The moisture content of forest fuels — A review of
 *     the basic concepts." Forest Fire Research Institute, Ottawa.
 *   NWCG PMS 437, Table 4 ("Fine Fuel Moisture Reference Tables").
 */

export type FuelClass = "1h" | "10h" | "100h";

export interface FMCInput {
  tempC: number | null;
  humidityPct: number | null;
  precipMm24h?: number | null;
  fuelClass?: FuelClass;
}

export interface FMCResult {
  value: number; // FMC %
  source: "Simard 1968 EMC" | "saturated (recent rain)" | "unavailable";
  fuelClass: FuelClass;
  inputs: { tempC: number | null; humidityPct: number | null; precipMm24h: number | null };
}

/**
 * Simard (1968) EMC formula. Inputs in Fahrenheit and RH%.
 * Returns moisture content as a percentage (0–35 typical range).
 */
function simardEMC(tempF: number, rh: number): number {
  if (rh < 10) {
    return 0.03229 + 0.281073 * rh - 0.000578 * rh * tempF;
  }
  if (rh < 50) {
    return 2.22749 + 0.160107 * rh - 0.014784 * tempF;
  }
  return (
    21.0606 +
    0.005565 * rh * rh -
    0.00035 * rh * tempF -
    0.483199 * rh
  );
}

/**
 * Apply a fuel-class lag: heavier fuels respond more slowly to ambient
 * conditions, so their FMC is biased toward the running mean rather than
 * the instantaneous EMC.
 *
 * Approximation only; for precise multi-day tracking you'd integrate over
 * the time-decaying response. For single-snapshot dashboard use this is fine.
 */
function applyFuelLag(emc: number, fuelClass: FuelClass): number {
  switch (fuelClass) {
    case "1h":
      return emc; // ~ 1 hour response → ≈ EMC
    case "10h":
      return emc + 1.0; // crude bias upward
    case "100h":
      return emc + 2.5;
  }
}

/**
 * Compute dead fuel moisture content. Returns null-safe result with provenance.
 */
export function nelsonFMC(input: FMCInput): FMCResult {
  const { tempC, humidityPct, precipMm24h = null, fuelClass = "1h" } = input;

  const inputs = { tempC, humidityPct, precipMm24h };

  if (tempC == null || humidityPct == null) {
    return { value: NaN, source: "unavailable", fuelClass, inputs };
  }

  // Recent significant rain → fuels are saturated. NWCG uses ≥ 0.1 inch
  // (≈ 2.5 mm) as the threshold for "wetting rain".
  if (precipMm24h != null && precipMm24h >= 2.5) {
    return {
      value: 30, // saturated 1-hour fuels typically cap at ~30%
      source: "saturated (recent rain)",
      fuelClass,
      inputs,
    };
  }

  const tempF = tempC * 1.8 + 32;
  const rh = Math.max(0.5, Math.min(99.5, humidityPct));

  const emc = simardEMC(tempF, rh);
  const fmc = applyFuelLag(emc, fuelClass);

  // Clamp to a physically sensible range.
  const clamped = Math.max(2, Math.min(35, fmc));

  return {
    value: Number(clamped.toFixed(1)),
    source: "Simard 1968 EMC",
    fuelClass,
    inputs,
  };
}
