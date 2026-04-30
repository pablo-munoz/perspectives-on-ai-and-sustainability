"use client";

import useSWR, { mutate } from "swr";

export interface LiveWeather {
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  precipitation: number | null;
  lastUpdated: string;
  source: string;
  station?: string;
}

export interface LiveHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  confidenceLabel: string;
  satellite: string;
  timestamp: string;
}

export interface FirmsResponse {
  hotspots: LiveHotspot[];
  source: string;
  count?: number;
  note?: string;
  error?: string;
  fetchedAt: string;
}

export interface RiskZoneResult {
  zoneId: string;
  zoneName: string;
  baseScore: number;
  weatherModifier: number;
  dynamicScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  modifiersApplied: string[];
}

export interface RiskResponse {
  zones: RiskZoneResult[];
  model: {
    model: string;
    accuracy: number;
    kappa: number;
    featureImportance: Record<string, number>;
    trainingPeriod: string;
  };
  weather: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    source: string;
  } | null;
  timestamp: string;
  error?: string;
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok && res.status >= 500) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
};

const POLL_INTERVALS = {
  weather: 5 * 60 * 1000, // 5 min
  firms: 10 * 60 * 1000, // 10 min
  risk: 5 * 60 * 1000, // 5 min
  alerts: 3 * 60 * 1000, // 3 min
};

export interface DerivedAlert {
  id: string;
  type: "heat" | "wind" | "fire" | "drought" | "humidity";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
}

export interface AlertsResponse {
  alerts: DerivedAlert[];
  count: number;
  fetchedAt: string;
  error?: string;
}

export function useWeather() {
  const { data, error, isLoading, mutate: refresh } = useSWR<LiveWeather>(
    "/api/weather",
    fetcher,
    {
      refreshInterval: POLL_INTERVALS.weather,
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
    }
  );
  return { weather: data, error, isLoading, refresh };
}

export function useFirms() {
  const { data, error, isLoading, mutate: refresh } = useSWR<FirmsResponse>(
    "/api/firms",
    fetcher,
    {
      refreshInterval: POLL_INTERVALS.firms,
      revalidateOnFocus: true,
      dedupingInterval: 120_000,
    }
  );
  return { firms: data, error, isLoading, refresh };
}

export function useRisk() {
  const { data, error, isLoading, mutate: refresh } = useSWR<RiskResponse>(
    "/api/risk",
    fetcher,
    {
      refreshInterval: POLL_INTERVALS.risk,
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
    }
  );
  return { risk: data, error, isLoading, refresh };
}

export function useAlerts() {
  const { data, error, isLoading, mutate: refresh } = useSWR<AlertsResponse>(
    "/api/alerts",
    fetcher,
    {
      refreshInterval: POLL_INTERVALS.alerts,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );
  return { alerts: data, error, isLoading, refresh };
}

export interface ModelMetadata {
  model: string;
  nTrees: number;
  accuracy: number;
  kappa: number;
  featureImportance: Record<string, number>;
  zoneRiskScores: Record<string, number>;
  trainingPeriod: string;
  predictionYear: number;
  generatedAt: string;
  metrics: { precision: number; recall: number; f1: number; auc: number };
  confusionMatrix: { tp: number; fp: number; tn: number; fn: number };
  samples: { total: number; training: number; validation: number; positive: number; negative: number };
}

export function useModel() {
  const { data, error, isLoading } = useSWR<ModelMetadata>("/api/model", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });
  return { model: data, error, isLoading };
}

export function refreshAll() {
  return Promise.all([
    mutate("/api/weather"),
    mutate("/api/firms"),
    mutate("/api/risk"),
    mutate("/api/alerts"),
  ]);
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
