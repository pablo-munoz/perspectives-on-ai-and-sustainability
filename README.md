# Fire Watch Ourense

Real-time, AI-powered wildfire risk dashboard for the rural areas of Ourense, Galicia (Spain). Combines satellite fire detections (NASA FIRMS), live weather observations (AEMET), and a Random Forest model trained in Google Earth Engine to produce dynamic per-zone risk scores.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Leaflet** + dark CARTO tiles for the map
- **Recharts** for analytics
- **SWR** for live polling
- **Motion** for transitions, **Sonner** for toast notifications
- **Tailwind CSS 4**

## Real-time architecture

| Source | Endpoint | Server cache | Client poll |
|--------|----------|--------------|-------------|
| AEMET observations | `/api/weather` | 5 min | 5 min |
| NASA FIRMS hotspots | `/api/firms` | 10 min | 10 min |
| Dynamic risk scoring | `/api/risk` | 5 min | 5 min |
| Derived alerts | `/api/alerts` | 5 min | 3 min |
| ML model metadata | `/api/model` | static | once |
| Health check | `/api/health` | — | — |

A new fire detection or critical alert triggers a toast notification; the live indicator in the header shows the time since the last successful refresh.

## ML pipeline

The Random Forest is trained in Google Earth Engine on EFFIS historical fire footprints (2015–2023) with 8 features (NDVI, LST, slope, NDMI, elevation, distance to roads/urban, aspect). Output (`src/lib/model-output.json`) is consumed by the `risk-engine.ts` library, which adds five live weather modifiers on top of the base scores:

- Temperature > 35 °C → +0.15
- Humidity < 30 % → +0.10
- Wind > 30 km/h → +0.10
- 0 mm precipitation → +0.10
- Active hotspot in zone → +0.20

Final dynamic score = `clamp(base_score + Σ modifiers, 0, 1)`.

To retrain the model, run [ml/train_fire_risk_model.py](ml/train_fire_risk_model.py) inside Google Earth Engine (Python API or Colab).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev                  # http://localhost:4000
```

### Environment variables

```
AEMET_API_KEY=<from https://opendata.aemet.es/centrodedescargas/altaUsuario>
FIRMS_MAP_KEY=<from https://firms.modaps.eosdis.nasa.gov/api/area/>
```

The dashboard degrades gracefully to mock data if either key is missing.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── alerts/      derived alerts
│   │   ├── firms/       NASA FIRMS proxy
│   │   ├── health/      health check
│   │   ├── model/       ML metadata
│   │   ├── risk/        dynamic scoring
│   │   └── weather/     AEMET proxy
│   ├── error.tsx        global error boundary
│   ├── icon.svg         favicon
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   └── page.tsx         dashboard shell
├── components/          UI panels
└── lib/
    ├── hooks.ts         SWR live-data hooks
    ├── mock-data.ts     fallback dataset
    ├── model-output.json baseline RF scores
    ├── risk-engine.ts   weather modifier engine
    └── utils.ts
ml/
├── train_fire_risk_model.py  GEE training pipeline
└── README_ML.md
```

## Deploy

Optimised for Vercel:

```bash
vercel --prod
```

Set `AEMET_API_KEY` and `FIRMS_MAP_KEY` as environment variables in the Vercel project.

## Credits

Built for *Perspectives on AI & Sustainability*, ESADE 2026 — Pablo Muñoz.
