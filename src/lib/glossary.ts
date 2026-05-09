/**
 * Single source of truth for every technical term shown in the dashboard.
 *
 * Each entry powers:
 *   - <MetricInfo termId="fwi" /> popovers
 *   - /glossary page entries
 *   - /methodology page anchors (/methodology#fwi)
 *
 * Threshold tones map to the YlOrRd scale used for risk levels.
 */

export type TermTone = "low" | "moderate" | "high" | "critical";

export interface Threshold {
  label: string;
  range: string;
  tone: TermTone;
}

export interface GlossaryEntry {
  id: string;
  abbr: string;
  title: { es: string; en: string };
  category: "meteorology" | "vegetation" | "satellite" | "model" | "index";
  definition: { es: string; en: string };
  range: string;
  units?: string;
  thresholds?: Threshold[];
  source: string;
  sourceUrl?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "fwi",
    abbr: "FWI",
    title: { es: "Fire Weather Index", en: "Fire Weather Index" },
    category: "index",
    definition: {
      es: "Estimación meteorológica de la intensidad potencial de un incendio. Combina viento, temperatura, humedad y precipitación acumulada.",
      en: "Meteorology-based estimate of potential fire intensity. Combines wind, temperature, humidity and accumulated precipitation.",
    },
    range: "0 → 50+",
    thresholds: [
      { label: "Very Low", range: "<5.2", tone: "low" },
      { label: "Low", range: "5.2 – 11.2", tone: "low" },
      { label: "Moderate", range: "11.2 – 21.3", tone: "moderate" },
      { label: "High", range: "21.3 – 38.0", tone: "high" },
      { label: "Very High", range: "38.0 – 50.0", tone: "high" },
      { label: "Extreme", range: "≥ 50", tone: "critical" },
    ],
    source: "Van Wagner 1987 · EFFIS classes",
    sourceUrl: "https://forest-fire.emergency.copernicus.eu/about-effis/technical-background",
  },
  {
    id: "ffmc",
    abbr: "FFMC",
    title: {
      es: "Fine Fuel Moisture Code",
      en: "Fine Fuel Moisture Code",
    },
    category: "index",
    definition: {
      es: "Humedad de combustibles finos (hojarasca, hierba seca) en las últimas 16 h. Valores altos = ignición fácil.",
      en: "Moisture of fine litter from the last 16 hours. High values = easy ignition.",
    },
    range: "0 → 101",
    thresholds: [
      { label: "Wet", range: "<70", tone: "low" },
      { label: "Dry", range: "70 – 84", tone: "moderate" },
      { label: "Easy ignition", range: "85 – 92", tone: "high" },
      { label: "Critical", range: "≥ 92", tone: "critical" },
    ],
    source: "Van Wagner 1987",
  },
  {
    id: "dmc",
    abbr: "DMC",
    title: { es: "Duff Moisture Code", en: "Duff Moisture Code" },
    category: "index",
    definition: {
      es: "Humedad de la capa orgánica intermedia (mantillo). Responde a humedad y precipitación a escala semanal.",
      en: "Moisture of the loose duff layer. Responds to humidity and rain on a weekly scale.",
    },
    range: "0 → 150+",
    source: "Van Wagner 1987",
  },
  {
    id: "dc",
    abbr: "DC",
    title: { es: "Drought Code", en: "Drought Code" },
    category: "index",
    definition: {
      es: "Humedad del suelo profundo. Acumulador estacional: refleja sequía a largo plazo.",
      en: "Deep soil layer moisture. Seasonal accumulator reflecting long-term drought.",
    },
    range: "0 → 800+",
    source: "Van Wagner 1987",
  },
  {
    id: "isi",
    abbr: "ISI",
    title: {
      es: "Initial Spread Index",
      en: "Initial Spread Index",
    },
    category: "index",
    definition: {
      es: "Tasa potencial de propagación inicial del fuego. Combina FFMC con viento.",
      en: "Potential initial fire spread rate. Combines FFMC with wind.",
    },
    range: "0 → 50+",
    source: "Van Wagner 1987",
  },
  {
    id: "bui",
    abbr: "BUI",
    title: { es: "Build-Up Index", en: "Build-Up Index" },
    category: "index",
    definition: {
      es: "Cantidad total de combustible disponible para una llama sostenida.",
      en: "Total fuel available for a sustained flame.",
    },
    range: "0 → 200+",
    source: "Van Wagner 1987",
  },
  {
    id: "ndvi",
    abbr: "NDVI",
    title: {
      es: "Normalized Difference Vegetation Index",
      en: "Normalized Difference Vegetation Index",
    },
    category: "vegetation",
    definition: {
      es: "Vigor de la vegetación medido por satélite Sentinel-2. Combina las bandas roja e infrarroja cercana.",
      en: "Satellite-measured vegetation greenness. Combines red and near-infrared bands.",
    },
    range: "−1 → +1",
    thresholds: [
      { label: "Bare / stressed", range: "<0.2", tone: "critical" },
      { label: "Sparse", range: "0.2 – 0.4", tone: "high" },
      { label: "Moderate", range: "0.4 – 0.6", tone: "moderate" },
      { label: "Healthy canopy", range: "≥ 0.6", tone: "low" },
    ],
    source: "Copernicus Sentinel-2",
    sourceUrl: "https://dataspace.copernicus.eu/",
  },
  {
    id: "ndmi",
    abbr: "NDMI",
    title: {
      es: "Normalized Difference Moisture Index",
      en: "Normalized Difference Moisture Index",
    },
    category: "vegetation",
    definition: {
      es: "Contenido de agua de la vegetación. Bandas NIR y SWIR. Cae antes que el NDVI cuando hay sequía.",
      en: "Vegetation water content. Uses NIR and SWIR bands. Drops earlier than NDVI under drought.",
    },
    range: "−1 → +1",
    source: "Copernicus Sentinel-2",
  },
  {
    id: "fmc",
    abbr: "FMC",
    title: {
      es: "Fuel Moisture Content",
      en: "Fuel Moisture Content",
    },
    category: "vegetation",
    definition: {
      es: "Porcentaje de agua en la vegetación viva. Estimación Nelson 400-h a partir de temperatura, humedad y precipitación.",
      en: "Water content of live vegetation as % of dry weight. Nelson 400-hour estimate from temperature, humidity and rain.",
    },
    range: "0 % → 200 %",
    units: "%",
    thresholds: [
      { label: "Critical", range: "<8 %", tone: "critical" },
      { label: "Drying", range: "8 – 12 %", tone: "high" },
      { label: "Moderate", range: "12 – 30 %", tone: "moderate" },
      { label: "Moist", range: "≥ 30 %", tone: "low" },
    ],
    source: "Nelson 2000 (400-h)",
  },
  {
    id: "lst",
    abbr: "LST",
    title: {
      es: "Land Surface Temperature",
      en: "Land Surface Temperature",
    },
    category: "satellite",
    definition: {
      es: "Temperatura de la superficie del suelo medida por MODIS/VIIRS — no la del aire. Diferencias >15 °C respecto al aire indican sequía superficial.",
      en: "Skin temperature of the ground from MODIS/VIIRS — not air temperature. Gaps >15 °C vs air suggest surface drought.",
    },
    range: "−20 → 60",
    units: "°C",
    source: "NASA LP DAAC · MODIS MOD11A1",
    sourceUrl: "https://lpdaac.usgs.gov/products/mod11a1v061/",
  },
  {
    id: "kbdi",
    abbr: "KBDI",
    title: {
      es: "Keetch-Byram Drought Index",
      en: "Keetch-Byram Drought Index",
    },
    category: "index",
    definition: {
      es: "Sequía acumulada del suelo a 8 pulgadas (~20 cm). Empieza el año en 0 y crece sin lluvia.",
      en: "Accumulated soil drought at 8 inches (~20 cm). Resets to 0 each year and grows with rainfall deficit.",
    },
    range: "0 → 800",
    thresholds: [
      { label: "Wet", range: "0 – 200", tone: "low" },
      { label: "Drying", range: "200 – 400", tone: "moderate" },
      { label: "Drought", range: "400 – 600", tone: "high" },
      { label: "Severe drought", range: "≥ 600", tone: "critical" },
    ],
    source: "Keetch & Byram 1968",
  },
  {
    id: "spi",
    abbr: "SPI",
    title: {
      es: "Standardized Precipitation Index",
      en: "Standardized Precipitation Index",
    },
    category: "index",
    definition: {
      es: "Anomalía de precipitación normalizada respecto a la climatología. Negativos = más seco que lo normal.",
      en: "Precipitation anomaly normalized against climatology. Negative = drier than normal.",
    },
    range: "−3 → +3",
    thresholds: [
      { label: "Severely dry", range: "≤ −2", tone: "critical" },
      { label: "Moderately dry", range: "−2 → −1", tone: "high" },
      { label: "Near normal", range: "−1 → +1", tone: "low" },
      { label: "Wet", range: "≥ +1", tone: "low" },
    ],
    source: "McKee et al. 1993",
  },
  {
    id: "firms",
    abbr: "FIRMS",
    title: {
      es: "Fire Information for Resource Management System",
      en: "Fire Information for Resource Management System",
    },
    category: "satellite",
    definition: {
      es: "Sistema de NASA que distribuye detecciones de incendios activos casi en tiempo real desde MODIS y VIIRS.",
      en: "NASA system distributing near-real-time active fire detections from MODIS and VIIRS.",
    },
    range: "—",
    source: "NASA EOSDIS FIRMS",
    sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
  },
  {
    id: "viirs",
    abbr: "VIIRS",
    title: {
      es: "Visible Infrared Imaging Radiometer Suite",
      en: "Visible Infrared Imaging Radiometer Suite",
    },
    category: "satellite",
    definition: {
      es: "Sensor a bordo de S-NPP y NOAA-20. Resolución 375 m: detecta incendios pequeños que MODIS pierde.",
      en: "Sensor on S-NPP and NOAA-20. 375 m resolution detects small fires MODIS misses.",
    },
    range: "—",
    source: "NASA / NOAA",
  },
  {
    id: "frp",
    abbr: "FRP",
    title: {
      es: "Fire Radiative Power",
      en: "Fire Radiative Power",
    },
    category: "satellite",
    definition: {
      es: "Energía emitida por un incendio en megavatios. Aproxima la intensidad del fuego en el momento de la detección.",
      en: "Energy emitted by a fire in megawatts. Approximates fire intensity at detection.",
    },
    range: "0 → 1000+",
    units: "MW",
    source: "MODIS Fire Products",
  },
  {
    id: "effis",
    abbr: "EFFIS",
    title: {
      es: "European Forest Fire Information System",
      en: "European Forest Fire Information System",
    },
    category: "satellite",
    definition: {
      es: "Servicio de la Comisión Europea (JRC) que publica el FWI europeo a 0,25° y perímetros quemados.",
      en: "EU Commission service (JRC) publishing the European FWI at 0.25° and burnt-area perimeters.",
    },
    range: "—",
    source: "Copernicus EFFIS",
    sourceUrl: "https://forest-fire.emergency.copernicus.eu/",
  },
  {
    id: "risk-score",
    abbr: "Risk score",
    title: {
      es: "Risk score (Fire-See)",
      en: "Risk score (Fire-See)",
    },
    category: "model",
    definition: {
      es: "Probabilidad 0–1 que estima un Random Forest entrenado con datos 2015–2023. Combina vegetación (NDVI/NDMI), terreno, clima reciente y FWI.",
      en: "0–1 probability from a Random Forest trained on 2015–2023 data. Combines vegetation, terrain, recent weather and FWI.",
    },
    range: "0 → 1",
    thresholds: [
      { label: "Low", range: "<0.25", tone: "low" },
      { label: "Medium", range: "0.25 – 0.5", tone: "moderate" },
      { label: "High", range: "0.5 – 0.75", tone: "high" },
      { label: "Critical", range: "≥ 0.75", tone: "critical" },
    ],
    source: "Fire-See model — see /methodology",
  },
  {
    id: "anomaly",
    abbr: "Anomaly",
    title: {
      es: "Anomaly (statistical)",
      en: "Anomaly (statistical)",
    },
    category: "model",
    definition: {
      es: "Snapshot cuyo valor supera μ + 2σ respecto a la línea base estacional de la zona. Señala desviaciones inusuales que merecen revisión.",
      en: "Snapshot exceeding μ + 2σ of the zone's seasonal baseline. Flags unusual deviations that deserve review.",
    },
    range: "—",
    source: "Fire-See internal",
  },
];

export function getEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.id === id);
}

export const TERM_BY_CATEGORY: Record<GlossaryEntry["category"], string> = {
  meteorology: "Meteorología",
  vegetation: "Vegetación",
  satellite: "Satélite",
  index: "Índices",
  model: "Modelo",
};

export const TONE_COLOR: Record<TermTone, string> = {
  low: "#fed976",
  moderate: "#feb24c",
  high: "#fd8d3c",
  critical: "#bd0026",
};
