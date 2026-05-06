# Reproducing the Fire-See ML model

This pipeline trains a Random Forest classifier on satellite-derived features
(NDVI, NDMI, LST, slope, aspect, elevation, distance-to-roads, distance-to-urban)
using historical MODIS burned-area as labels, then exports the model as ONNX
for runtime inference inside the Next.js dashboard.

## Prerequisites

1. **Google Earth Engine project** (free academic tier). The current project ID
   is `fire-see-ml-495509`.
2. **Service account JSON** with roles:
   - `Earth Engine Resource Viewer`
   - `Service Usage Consumer`
3. The JSON file lives at `~/.config/fire-see/gee-key.json` (mode 600). Don't
   commit it.

The script reads the path from the env var
`GEE_SERVICE_ACCOUNT_KEY_PATH` (already set in `.env.local`).

## Run it

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# The script reads .env.local; either source it or export the vars:
export GEE_SERVICE_ACCOUNT_KEY_PATH=$HOME/.config/fire-see/gee-key.json
export GEE_PROJECT_ID=fire-see-ml-495509

python train_and_export.py
```

Wall-clock time on a fresh run: **8–15 minutes**, dominated by GEE point
sampling and the `historical-fires.json` per-year reduceRegion calls.

## Outputs

After a successful run you will have:

```
ml/artifacts/
├── fire_risk_rf.onnx           # the trained model (~1 MB)
├── feature_columns.json        # input order
├── zone-features-static.json   # per-zone mean feature vector at FEATURE_YEAR
├── zone-baseline-scores.json   # baseline probability per zone
└── historical-fires.json       # per-zone fire pixel count by year
src/lib/model-output.json       # updated with real metrics
```

Commit all of them. The `.onnx` is ~1 MB and is fine in git.

## Sanity checks

After the run, verify:

- **AUC ≥ 0.80** (target). If lower, the satellite data window may have been
  too cloudy — re-run with a wider date range.
- `zone-baseline-scores.json` has 8 zones with scores in [0, 1].
- `feature_columns.json` order matches the `FEATURE_ORDER` list inside
  `train_and_export.py` and inside `src/lib/ml.ts` (Phase B).

## Troubleshooting

**`ee.EEException: Permission denied`**: the service account is missing the
Earth Engine role. Re-grant `Earth Engine Resource Viewer` in IAM.

**`Image.normalizedDifference: empty collection`**: nothing matched the cloud
filter for the season. Bump `CLOUDY_PIXEL_PERCENTAGE` from 30 to 50 in
`build_feature_stack`.

**`getInfo` timeout**: usually a transient GEE backend issue. Re-run.

**`skl2onnx`/onnx version mismatch**: pin the versions in `requirements.txt`
(already pinned). Also pin `onnxruntime-node` in package.json on the JS side.
