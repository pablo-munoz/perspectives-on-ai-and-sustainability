# Fire Watch Ourense — ML Model

## Random Forest Fire Susceptibility Model

### Quick Start (Google Colab)

1. Open Google Colab: https://colab.research.google.com
2. Upload `train_fire_risk_model.py`
3. Run:

```python
!pip install earthengine-api
import ee
ee.Authenticate()
ee.Initialize(project='your-gee-project-id')

# Run the full pipeline
%run train_fire_risk_model.py
```

### Quick Start (Local)

```bash
pip install -r requirements.txt
earthengine authenticate
python train_fire_risk_model.py
```

### Pipeline Steps

1. **Study Area** — Ourense province boundary from FAO GAUL
2. **Training Labels** — Historical fire perimeters (MODIS MCD64A1, 2015–2023)
3. **Feature Stack** — NDVI, moisture (Sentinel-2), LST (MODIS), slope/aspect/elevation (SRTM), distance to roads, distance to urban
4. **Training** — Random Forest with 100 trees, 70/30 train/test split
5. **Evaluation** — Accuracy, Kappa, confusion matrix, variable importance
6. **Prediction** — Fire risk probability map for all of Ourense
7. **Export** — GeoTIFF to Google Drive + zone statistics JSON for dashboard

### Output

- `ourense_fire_risk_probability.tif` — Continuous risk map (0–1)
- `ourense_fire_risk_levels.tif` — Classified map (1=Low, 2=Medium, 3=High, 4=Critical)
- `src/lib/model-output.json` — Zone risk scores for the dashboard

### Integration with Dashboard

The `model-output.json` file is read by the dashboard's dynamic risk scoring engine,
which combines the base ML scores with real-time weather modifiers (AEMET API) to
produce daily updated risk levels.
