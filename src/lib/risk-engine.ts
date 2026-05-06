/**
 * Fire Watch Ourense — Dynamic Risk Scoring Engine
 * ==================================================
 *
 * Combines base ML risk scores (from Random Forest model) with
 * real-time weather modifiers (AEMET API) to produce dynamic
 * daily risk levels.
 *
 * Formula:
 *   dynamic_risk = clamp(base_score + Σ(modifiers), 0, 1)
 *
 * Modifiers (from Section 7.4 of implementation plan):
 *   - Temperature > 35°C  → +0.15
 *   - Humidity < 30%      → +0.10
 *   - Wind speed > 30km/h → +0.10
 *   - No rain in 7 days   → +0.10
 *   - Active thermal anomaly nearby → +0.20
 */

import type { RiskLevel } from "./mock-data";
import modelOutput from "./model-output.json";
import { predictAllZonesStatic } from "./ml";

export interface WeatherConditions {
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitation: number | null;
}

export interface DynamicRiskResult {
  zoneId: string;
  zoneName: string;
  baseScore: number;
  weatherModifier: number;
  dynamicScore: number;
  riskLevel: RiskLevel;
  modifiersApplied: string[];
}

export interface ModelInfo {
  model: string;
  accuracy: number;
  kappa: number;
  featureImportance: Record<string, number>;
  trainingPeriod: string;
}

/**
 * Calculate weather-based risk modifier.
 */
export function calculateWeatherModifier(
  weather: WeatherConditions,
  hasActiveHotspot: boolean = false
): { modifier: number; applied: string[] } {
  let modifier = 0;
  const applied: string[] = [];

  // Temperature > 35°C → +0.15
  if (weather.temperature != null && weather.temperature > 35) {
    modifier += 0.15;
    applied.push(`Temp ${weather.temperature}°C > 35°C (+0.15)`);
  }
  // Temperature > 30°C → +0.08 (moderate heat)
  else if (weather.temperature != null && weather.temperature > 30) {
    modifier += 0.08;
    applied.push(`Temp ${weather.temperature}°C > 30°C (+0.08)`);
  }

  // Humidity < 30% → +0.10
  if (weather.humidity != null && weather.humidity < 30) {
    modifier += 0.10;
    applied.push(`Humidity ${weather.humidity}% < 30% (+0.10)`);
  }
  // Humidity < 40% → +0.05
  else if (weather.humidity != null && weather.humidity < 40) {
    modifier += 0.05;
    applied.push(`Humidity ${weather.humidity}% < 40% (+0.05)`);
  }

  // Wind > 30 km/h → +0.10
  if (weather.windSpeed != null && weather.windSpeed > 30) {
    modifier += 0.10;
    applied.push(`Wind ${weather.windSpeed}km/h > 30km/h (+0.10)`);
  }
  // Wind > 20 km/h → +0.05
  else if (weather.windSpeed != null && weather.windSpeed > 20) {
    modifier += 0.05;
    applied.push(`Wind ${weather.windSpeed}km/h > 20km/h (+0.05)`);
  }

  // No rain (0mm) → +0.10
  if (weather.precipitation != null && weather.precipitation === 0) {
    modifier += 0.10;
    applied.push("No precipitation (+0.10)");
  }

  // Active thermal anomaly nearby → +0.20
  if (hasActiveHotspot) {
    modifier += 0.20;
    applied.push("Active thermal anomaly detected (+0.20)");
  }

  return { modifier, applied };
}

/**
 * Score to risk level classification.
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 0.75) return "critical";
  if (score >= 0.50) return "high";
  if (score >= 0.25) return "medium";
  return "low";
}

/**
 * Compute dynamic risk for all zones.
 *
 * baseScore comes from running the trained Random Forest at runtime
 * (`predictAllZonesStatic`) on each zone's static feature vector. The weather
 * modifier (temp/humidity/wind/precip + active hotspot proximity) is then
 * stacked on top.
 */
export function computeDynamicRisk(
  weather: WeatherConditions,
  activeHotspotZones: string[] = []
): DynamicRiskResult[] {
  const predictions = predictAllZonesStatic();

  const results: DynamicRiskResult[] = predictions.map((p) => {
    const hasHotspot = activeHotspotZones.includes(p.zoneId);
    const { modifier, applied } = calculateWeatherModifier(weather, hasHotspot);
    const dynamicScore = Math.min(1, Math.max(0, p.baseScore + modifier));

    return {
      zoneId: p.zoneId,
      zoneName: p.zoneName,
      baseScore: p.baseScore,
      weatherModifier: modifier,
      dynamicScore,
      riskLevel: scoreToRiskLevel(dynamicScore),
      modifiersApplied: applied,
    };
  });

  return results.sort((a, b) => b.dynamicScore - a.dynamicScore);
}

/**
 * Get model metadata.
 */
export function getModelInfo(): ModelInfo {
  return {
    model: modelOutput.model,
    accuracy: modelOutput.accuracy,
    kappa: modelOutput.kappa,
    featureImportance: modelOutput.feature_importance,
    trainingPeriod: modelOutput.training_period,
  };
}
