export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskZone {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  vegetation: string;
  slopeDeg: number;
  coordinates: [number, number][];
  center: [number, number];
}

export interface FireHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  satellite: string;
  timestamp: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  fwi: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: "heat" | "wind" | "fire" | "drought";
  severity: RiskLevel;
  title: string;
  description: string;
  timestamp: string;
}

export interface DailyRisk {
  date: string;
  [zoneId: string]: number | string;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const riskZones: RiskZone[] = [
  {
    id: "z1",
    name: "Serra de San Mamede",
    riskLevel: "critical",
    riskScore: 0.88,
    vegetation: "Dense pine forest",
    slopeDeg: 28,
    coordinates: [
      [42.28, -7.95],
      [42.3, -7.9],
      [42.32, -7.92],
      [42.3, -7.97],
    ],
    center: [42.3, -7.935],
  },
  {
    id: "z2",
    name: "Ribeira Sacra",
    riskLevel: "high",
    riskScore: 0.72,
    vegetation: "Mixed oak & chestnut",
    slopeDeg: 35,
    coordinates: [
      [42.38, -7.72],
      [42.4, -7.68],
      [42.42, -7.71],
      [42.4, -7.75],
    ],
    center: [42.4, -7.715],
  },
  {
    id: "z3",
    name: "Baixa Limia",
    riskLevel: "high",
    riskScore: 0.65,
    vegetation: "Scrubland & eucalyptus",
    slopeDeg: 22,
    coordinates: [
      [41.95, -8.1],
      [41.97, -8.05],
      [42.0, -8.07],
      [41.98, -8.12],
    ],
    center: [41.975, -8.085],
  },
  {
    id: "z4",
    name: "Macizo Central",
    riskLevel: "critical",
    riskScore: 0.91,
    vegetation: "Dense eucalyptus",
    slopeDeg: 18,
    coordinates: [
      [42.2, -7.85],
      [42.22, -7.8],
      [42.25, -7.82],
      [42.23, -7.87],
    ],
    center: [42.225, -7.835],
  },
  {
    id: "z5",
    name: "Val do Arnoia",
    riskLevel: "medium",
    riskScore: 0.42,
    vegetation: "Riparian forest",
    slopeDeg: 8,
    coordinates: [
      [42.18, -8.05],
      [42.2, -8.0],
      [42.22, -8.02],
      [42.2, -8.07],
    ],
    center: [42.2, -8.035],
  },
  {
    id: "z6",
    name: "Serra do Invernadeiro",
    riskLevel: "medium",
    riskScore: 0.48,
    vegetation: "Birch & oak forest",
    slopeDeg: 30,
    coordinates: [
      [42.12, -7.55],
      [42.14, -7.5],
      [42.17, -7.52],
      [42.15, -7.57],
    ],
    center: [42.145, -7.535],
  },
  {
    id: "z7",
    name: "Celanova",
    riskLevel: "low",
    riskScore: 0.18,
    vegetation: "Agricultural land",
    slopeDeg: 5,
    coordinates: [
      [42.14, -7.98],
      [42.16, -7.94],
      [42.18, -7.96],
      [42.16, -8.0],
    ],
    center: [42.16, -7.97],
  },
  {
    id: "z8",
    name: "Verín",
    riskLevel: "low",
    riskScore: 0.22,
    vegetation: "Vineyard & pasture",
    slopeDeg: 10,
    coordinates: [
      [41.93, -7.45],
      [41.95, -7.4],
      [41.98, -7.42],
      [41.96, -7.47],
    ],
    center: [41.955, -7.435],
  },
];

export const fireHotspots: FireHotspot[] = [
  {
    id: "h1",
    lat: 42.29,
    lng: -7.93,
    brightness: 342.5,
    confidence: 92,
    satellite: "MODIS Terra",
    timestamp: "2026-04-16T14:30:00Z",
  },
  {
    id: "h2",
    lat: 42.22,
    lng: -7.83,
    brightness: 318.2,
    confidence: 78,
    satellite: "VIIRS SNPP",
    timestamp: "2026-04-16T13:15:00Z",
  },
  {
    id: "h3",
    lat: 42.39,
    lng: -7.7,
    brightness: 305.8,
    confidence: 65,
    satellite: "MODIS Aqua",
    timestamp: "2026-04-16T11:45:00Z",
  },
  {
    id: "h4",
    lat: 41.97,
    lng: -8.08,
    brightness: 298.1,
    confidence: 55,
    satellite: "VIIRS SNPP",
    timestamp: "2026-04-16T10:00:00Z",
  },
  {
    id: "h5",
    lat: 42.24,
    lng: -7.84,
    brightness: 356.9,
    confidence: 95,
    satellite: "MODIS Terra",
    timestamp: "2026-04-16T15:00:00Z",
  },
];

export const weatherData: WeatherData = {
  temperature: 34,
  humidity: 24,
  windSpeed: 28,
  windDirection: "SE",
  precipitation: 0,
  fwi: 38.5,
  lastUpdated: "2026-04-16T15:00:00Z",
};

export const alerts: Alert[] = [
  {
    id: "a1",
    type: "heat",
    severity: "critical",
    title: "Extreme Heat Warning",
    description:
      "Temperatures exceeding 35°C expected across Ourense province until Thursday.",
    timestamp: "2026-04-16T08:00:00Z",
  },
  {
    id: "a2",
    type: "drought",
    severity: "high",
    title: "Drought Advisory",
    description:
      "No significant precipitation in the last 14 days. Vegetation moisture critically low.",
    timestamp: "2026-04-15T12:00:00Z",
  },
  {
    id: "a3",
    type: "wind",
    severity: "medium",
    title: "Wind Advisory",
    description:
      "SE winds gusting up to 40 km/h expected this afternoon in mountain areas.",
    timestamp: "2026-04-16T10:00:00Z",
  },
  {
    id: "a4",
    type: "fire",
    severity: "critical",
    title: "Active Fire Detected",
    description:
      "FIRMS satellite detected high-confidence thermal anomaly in Macizo Central zone.",
    timestamp: "2026-04-16T15:00:00Z",
  },
];

export const dailyRiskTrend: DailyRisk[] = [
  { date: "Apr 10", z1: 0.62, z2: 0.5, z3: 0.45, z4: 0.7, avg: 0.52 },
  { date: "Apr 11", z1: 0.65, z2: 0.55, z3: 0.48, z4: 0.73, avg: 0.55 },
  { date: "Apr 12", z1: 0.71, z2: 0.58, z3: 0.52, z4: 0.78, avg: 0.6 },
  { date: "Apr 13", z1: 0.75, z2: 0.62, z3: 0.55, z4: 0.82, avg: 0.65 },
  { date: "Apr 14", z1: 0.8, z2: 0.65, z3: 0.58, z4: 0.85, avg: 0.7 },
  { date: "Apr 15", z1: 0.84, z2: 0.68, z3: 0.62, z4: 0.88, avg: 0.74 },
  { date: "Apr 16", z1: 0.88, z2: 0.72, z3: 0.65, z4: 0.91, avg: 0.78 },
];
