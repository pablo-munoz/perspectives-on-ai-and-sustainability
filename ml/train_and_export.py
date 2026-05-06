"""
Fire-See — Training & Export Pipeline
======================================
Hybrid pipeline:
  - Google Earth Engine: data acquisition (Sentinel-2 NDVI/NDMI, MODIS LST,
    SRTM terrain, MCD64A1 burned area, GHSL urban).
  - sklearn (local): Random Forest training and evaluation.
  - skl2onnx: serialize the trained model for runtime inference in Next.js
    via onnxruntime-node.

Outputs (committed to ml/artifacts/):
  - fire_risk_rf.onnx              Trained RF model
  - feature_columns.json           Feature order expected by the ONNX model
  - zone-features-static.json      Per-zone mean feature vector (today)
  - zone-baseline-scores.json      Per-zone probability from current features
  - historical-fires.json          Per-zone fire count by year (for baselines)

Also overwrites:
  - src/lib/model-output.json      Real metrics from validation set

Auth:
  Uses service account JSON pointed to by GEE_SERVICE_ACCOUNT_KEY_PATH env var.
  Falls back to interactive ee.Authenticate() if the env var is missing.

Usage:
  cd ml
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python train_and_export.py

Authors: Fire-See Team — ESADE 2026
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import ee
import joblib
import numpy as np
import pandas as pd
from google.oauth2 import service_account
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from skl2onnx import convert_sklearn, to_onnx
from skl2onnx.common.data_types import FloatTensorType


# ============================================================================
# Constants
# ============================================================================

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)

PROJECT_ID = os.environ.get("GEE_PROJECT_ID", "fire-see-ml-495509")
KEY_PATH = os.environ.get(
    "GEE_SERVICE_ACCOUNT_KEY_PATH",
    str(Path.home() / ".config" / "fire-see" / "gee-key.json"),
)

OURENSE_BBOX_COORDS = [-8.5, 41.8, -7.0, 42.5]

# Same zones as src/lib/mock-data.ts (rectangle approximations on the polygon)
ZONES: dict[str, dict] = {
    "z1": {"name": "Serra de San Mamede", "bbox": [-7.97, 42.28, -7.9, 42.32]},
    "z2": {"name": "Ribeira Sacra", "bbox": [-7.75, 42.38, -7.68, 42.42]},
    "z3": {"name": "Baixa Limia", "bbox": [-8.12, 41.95, -8.05, 42.0]},
    "z4": {"name": "Macizo Central", "bbox": [-7.87, 42.2, -7.8, 42.25]},
    "z5": {"name": "Val do Arnoia", "bbox": [-8.07, 42.18, -8.0, 42.22]},
    "z6": {"name": "Serra do Invernadeiro", "bbox": [-7.57, 42.12, -7.5, 42.17]},
    "z7": {"name": "Celanova", "bbox": [-8.0, 42.14, -7.94, 42.18]},
    "z8": {"name": "Verin", "bbox": [-7.47, 41.93, -7.4, 41.98]},
}

# Order matters — same order is hard-coded into the ONNX input vector.
FEATURE_ORDER = [
    "NDVI",
    "NDMI",
    "LST",
    "slope",
    "aspect",
    "elevation",
    "dist_roads",
    "dist_urban",
]

TRAINING_YEARS = (2015, 2024)
FEATURE_YEAR = 2024  # latest full fire season
N_SAMPLES_PER_CLASS = 600
N_TREES = 200
SEED = 42


# ============================================================================
# 1. Auth
# ============================================================================

def init_ee() -> None:
    if KEY_PATH and Path(KEY_PATH).exists():
        print(f"→ Auth via service account: {KEY_PATH}")
        credentials = service_account.Credentials.from_service_account_file(
            KEY_PATH,
            scopes=[
                "https://www.googleapis.com/auth/earthengine",
                "https://www.googleapis.com/auth/cloud-platform",
            ],
        )
        ee.Initialize(credentials=credentials, project=PROJECT_ID)
    else:
        print("⚠ No service account JSON — using interactive auth.")
        ee.Authenticate()
        ee.Initialize(project=PROJECT_ID)
    print("✓ Earth Engine ready")


# ============================================================================
# 2. Feature stack (NDVI, NDMI, LST, terrain, distance)
# ============================================================================

def _safe_distance_layer(
    region: ee.Geometry,
    asset_id: str,
    max_distance: int,
    out_name: str,
) -> ee.Image:
    """Try to load a FeatureCollection asset; fall back to a constant image."""
    try:
        fc = ee.FeatureCollection(asset_id).filterBounds(region)
        # Eager probe — forces GEE to validate asset right now.
        fc.size().getInfo()
        print(f"  ✓ {out_name}: using {asset_id}")
        return fc.distance(max_distance).rename(out_name).toFloat()
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠ {out_name}: asset unavailable ({exc.__class__.__name__}); using 0")
        return ee.Image.constant(0).rename(out_name).toFloat()


def _safe_urban_distance(region: ee.Geometry) -> ee.Image:
    """Distance to urban areas via GHSL built surface; fall back to constant."""
    try:
        img = (
            ee.Image("JRC/GHSL/P2023A/GHS_BUILT_S/2020").select("built_surface").gt(0)
        )
        # Eager probe
        img.bandNames().getInfo()
        return (
            img.fastDistanceTransform()
            .sqrt()
            .multiply(30)
            .rename("dist_urban")
            .toFloat()
        )
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠ dist_urban: GHSL unavailable ({exc.__class__.__name__}); using 0")
        return ee.Image.constant(0).rename("dist_urban").toFloat()


def build_feature_stack(region: ee.Geometry, year: int) -> ee.Image:
    print(f"→ Building feature stack for {year}…")

    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(f"{year}-06-01", f"{year}-09-30")
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        .median()
    )
    ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndmi = s2.normalizedDifference(["B8", "B11"]).rename("NDMI")

    modis_lst = (
        ee.ImageCollection("MODIS/061/MOD11A1")
        .filterBounds(region)
        .filterDate(f"{year}-06-01", f"{year}-09-30")
        .select("LST_Day_1km")
        .mean()
        .multiply(0.02)
        .subtract(273.15)
        .rename("LST")
    )

    dem = ee.Image("USGS/SRTMGL1_003")
    slope = ee.Terrain.slope(dem).rename("slope")
    aspect = ee.Terrain.aspect(dem).rename("aspect")
    elevation = dem.rename("elevation")

    # Distance to roads — GEE asset evaluation is lazy, so eagerly test
    # by triggering a tiny computation. Fall back to constant if missing.
    dist_roads = _safe_distance_layer(
        region,
        asset_id="projects/sat-io/open-datasets/GRIP4/grip4_total_TP",
        max_distance=5000,
        out_name="dist_roads",
    )
    dist_urban = _safe_urban_distance(region)

    stack = (
        ndvi.addBands(ndmi)
        .addBands(lst := modis_lst)
        .addBands(slope)
        .addBands(aspect)
        .addBands(elevation)
        .addBands(dist_roads)
        .addBands(dist_urban)
    )
    return stack


# ============================================================================
# 3. Training labels (burned vs non-burned)
# ============================================================================

def get_training_points(region: ee.Geometry, start: int, end: int) -> ee.FeatureCollection:
    """
    Build a balanced (or near-balanced) sample of burned vs non-burned pixels.

    MODIS MCD64A1 is mostly masked (NaN) where there's no burn, so we unmask
    to 0, threshold, cast to int, and let stratifiedSample handle both classes
    in one call. This avoids the silent zero-count issue with selfMask trick.
    """
    print(f"→ Sampling burned/non-burned points {start}-{end}…")
    burned_mask = (
        ee.ImageCollection("MODIS/061/MCD64A1")
        .filterBounds(region)
        .filterDate(f"{start}-01-01", f"{end}-12-31")
        .select("BurnDate")
        .max()
        .unmask(0)
        .gt(0)
        .rename("fire")
        .toInt()
        .clip(region)
    )

    samples = burned_mask.stratifiedSample(
        numPoints=N_SAMPLES_PER_CLASS,
        classBand="fire",
        region=region,
        scale=500,
        geometries=True,
        seed=SEED,
    )

    # Sanity probe: print class distribution
    try:
        hist = samples.aggregate_histogram("fire").getInfo()
        print(f"  Class counts → {hist}")
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠ Could not compute class histogram: {exc}")

    return samples


def extract_dataset(stack: ee.Image, points: ee.FeatureCollection) -> pd.DataFrame:
    print("→ Extracting feature values at training points…")
    sampled = stack.sampleRegions(
        collection=points,
        properties=["fire"],
        scale=30,
        geometries=False,
    )
    rows = sampled.toList(sampled.size()).getInfo()
    print(f"  ✓ Pulled {len(rows)} samples from GEE")

    records = []
    for row in rows:
        props = row["properties"]
        if any(props.get(b) is None for b in FEATURE_ORDER + ["fire"]):
            continue
        records.append(props)
    df = pd.DataFrame(records)
    print(f"  ✓ Clean dataset: {len(df)} rows × {df.shape[1]} cols")
    return df


# ============================================================================
# 4. Train + evaluate sklearn RF
# ============================================================================

def train_rf(df: pd.DataFrame) -> tuple[RandomForestClassifier, dict]:
    X = df[FEATURE_ORDER].astype("float32").values
    y = df["fire"].astype(int).values
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=SEED
    )

    print(f"→ Training RF n_trees={N_TREES} on {len(Xtr)} samples…")
    rf = RandomForestClassifier(
        n_estimators=N_TREES,
        max_depth=None,
        min_samples_split=4,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=SEED,
    )
    rf.fit(Xtr, ytr)

    yhat = rf.predict(Xte)
    yprob = rf.predict_proba(Xte)[:, 1]

    cm = confusion_matrix(yte, yhat).tolist()
    metrics = {
        "accuracy": float(accuracy_score(yte, yhat)),
        "kappa": float(cohen_kappa_score(yte, yhat)),
        "precision": float(precision_score(yte, yhat)),
        "recall": float(recall_score(yte, yhat)),
        "f1": float(f1_score(yte, yhat)),
        "auc": float(roc_auc_score(yte, yprob)),
        "confusion_matrix": cm,
        "samples": {
            "total": int(len(df)),
            "training": int(len(Xtr)),
            "validation": int(len(Xte)),
            "positive": int(int(y.sum())),
            "negative": int(len(y) - int(y.sum())),
        },
    }
    print("  ✓ Validation metrics:")
    for k in ["accuracy", "kappa", "precision", "recall", "f1", "auc"]:
        print(f"     {k:10s} {metrics[k]:.4f}")

    importance_pct = {
        name: float(round(w * 100, 4))
        for name, w in sorted(
            zip(FEATURE_ORDER, rf.feature_importances_),
            key=lambda kv: kv[1],
            reverse=True,
        )
    }
    metrics["feature_importance_pct"] = importance_pct
    return rf, metrics


# ============================================================================
# 5. ONNX export
# ============================================================================

def export_trees_json(rf: RandomForestClassifier, out_path: Path) -> int:
    """
    Serialize each decision tree of the RF as parallel typed arrays.

    The runtime predictor in TS walks the trees node-by-node:
      - feature[i] == -2  → leaf, return leaf_prob[i]
      - else descend left if x[feature[i]] <= threshold[i] else right.

    Output JSON shape (compact, no whitespace):
      {
        "format": "fire-see-rf-v1",
        "n_features": 8,
        "feature_order": [...],
        "n_trees": 200,
        "trees": [{ feature, threshold, left, right, leaf_prob }, ...]
      }
    """
    print(f"→ Serializing trees → {out_path.name}")
    trees_data = []
    for est in rf.estimators_:
        t = est.tree_
        # tree.value shape (n_nodes, 1, n_classes); for binary RF, n_classes=2.
        # Probability of class 1 at each node = counts_1 / total_counts.
        values = t.value[:, 0, :]
        totals = values.sum(axis=1)
        # Avoid division by zero (defensive; sklearn never emits empty leaves).
        safe_totals = np.where(totals > 0, totals, 1.0)
        leaf_prob = (values[:, 1] / safe_totals).astype(float).tolist()

        trees_data.append({
            "feature": t.feature.astype(int).tolist(),
            "threshold": t.threshold.astype(float).tolist(),
            "left": t.children_left.astype(int).tolist(),
            "right": t.children_right.astype(int).tolist(),
            "leaf_prob": leaf_prob,
        })

    payload = {
        "format": "fire-see-rf-v1",
        "n_features": len(FEATURE_ORDER),
        "feature_order": FEATURE_ORDER,
        "n_trees": len(rf.estimators_),
        "trees": trees_data,
    }
    out_path.write_text(json.dumps(payload, separators=(",", ":")))
    size_kb = out_path.stat().st_size // 1024
    print(f"  ✓ Wrote {size_kb} KB ({len(trees_data)} trees)")
    return size_kb


def export_onnx(
    rf: RandomForestClassifier, out_path: Path, sample: np.ndarray
) -> bool:
    """
    Try to convert sklearn RF to ONNX. Returns True on success.

    Tries two paths in order:
      1. skl2onnx.convert_sklearn with FloatTensorType + zipmap=False
      2. skl2onnx.to_onnx with explicit opsets {ai.onnx: 15, ai.onnx.ml: 2}

    Path 2 is more lenient with sklearn 1.5+ TreeEnsembleClassifier attribute
    encoding bugs in convert_sklearn.
    """
    print(f"→ Converting to ONNX → {out_path.name}")

    # Attempt 1: convert_sklearn
    try:
        initial_type = [("input", FloatTensorType([None, len(FEATURE_ORDER)]))]
        onnx_model = convert_sklearn(
            rf,
            initial_types=initial_type,
            target_opset=15,
            options={type(rf): {"zipmap": False}},
        )
        out_path.write_bytes(onnx_model.SerializeToString())
        print(f"  ✓ Wrote {out_path.stat().st_size // 1024} KB (via convert_sklearn)")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠ convert_sklearn failed: {exc.__class__.__name__}")

    # Attempt 2: to_onnx with explicit opsets
    try:
        x_sample = sample.astype(np.float32)
        onnx_model = to_onnx(
            rf,
            x_sample,
            options={type(rf): {"zipmap": False}},
            target_opset={"": 15, "ai.onnx.ml": 2},
        )
        out_path.write_bytes(onnx_model.SerializeToString())
        print(f"  ✓ Wrote {out_path.stat().st_size // 1024} KB (via to_onnx)")
        return True
    except Exception as exc:  # noqa: BLE001
        # Don't print the full traceback — the inner attribute dict is huge.
        print(f"  ⚠ to_onnx failed: {exc.__class__.__name__}")

    print("  → Skipping ONNX. JSON-tree predictor will be used at runtime.")
    return False


# ============================================================================
# 6. Per-zone feature snapshot + baseline scores
# ============================================================================

def zone_geometry(zid: str) -> ee.Geometry:
    return ee.Geometry.Rectangle(ZONES[zid]["bbox"])


def zone_feature_means(stack: ee.Image, zid: str) -> dict:
    geom = zone_geometry(zid)
    means = stack.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=100,
        maxPixels=int(1e8),
    ).getInfo()
    return {b: (float(means[b]) if means.get(b) is not None else 0.0) for b in FEATURE_ORDER}


def historical_fires_per_zone(start: int, end: int) -> dict:
    print("→ Computing historical fire counts per zone/year…")
    out: dict[str, dict[str, int]] = {zid: {} for zid in ZONES}
    for year in range(start, end + 1):
        burned = (
            ee.ImageCollection("MODIS/061/MCD64A1")
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .select("BurnDate")
            .max()
            .gt(0)
        )
        for zid in ZONES:
            stats = burned.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=zone_geometry(zid),
                scale=500,
                maxPixels=int(1e7),
            ).getInfo()
            count = int(stats.get("BurnDate") or 0)
            out[zid][str(year)] = count
        print(f"  ✓ {year}")
    return out


# ============================================================================
# 7. Main
# ============================================================================

def main() -> int:
    print("=" * 72)
    print("  Fire-See — train & export pipeline")
    print("=" * 72)

    init_ee()

    region = ee.Geometry.Rectangle(OURENSE_BBOX_COORDS)
    stack = build_feature_stack(region, FEATURE_YEAR)

    # Cache the training data to disk so reruns skip the slow GEE extraction.
    cache_path = ARTIFACTS / "training_data.csv"
    if cache_path.exists():
        print(f"→ Loading cached training data from {cache_path.name}")
        df = pd.read_csv(cache_path)
        print(f"  ✓ {len(df)} rows × {df.shape[1]} cols (delete the file to refresh)")
    else:
        points = get_training_points(region, *TRAINING_YEARS)
        df = extract_dataset(stack, points)
        df.to_csv(cache_path, index=False)
        print(f"  ✓ Cached training data → {cache_path.name}")

    if len(df) < 50:
        print("✗ Not enough clean samples — aborting.")
        return 1

    rf, metrics = train_rf(df)

    # Save sklearn model immediately — ONNX may fail but we'll always have this.
    pkl_path = ARTIFACTS / "fire_risk_rf.pkl"
    joblib.dump(rf, pkl_path)
    print(f"  ✓ sklearn model saved → {pkl_path.name} ({pkl_path.stat().st_size // 1024} KB)")

    # Primary deployment format: JSON of serialized trees (TS predictor reads it).
    trees_json_path = ARTIFACTS / "fire_risk_rf_trees.json"
    export_trees_json(rf, trees_json_path)

    # Best-effort ONNX (skl2onnx 1.18 + sklearn 1.5 has a known TreeEnsemble bug;
    # we attempt anyway so when the upstream lib fixes it we get the artifact).
    onnx_path = ARTIFACTS / "fire_risk_rf.onnx"
    sample_X = df[FEATURE_ORDER].head(1).astype("float32").values
    onnx_ok = export_onnx(rf, onnx_path, sample_X)

    feature_cols_path = ARTIFACTS / "feature_columns.json"
    feature_cols_path.write_text(json.dumps(FEATURE_ORDER, indent=2))

    print("→ Computing per-zone feature means + baseline scores…")
    zone_features: dict[str, dict] = {}
    zone_baselines: dict[str, dict] = {}
    for zid, info in ZONES.items():
        feats = zone_feature_means(stack, zid)
        zone_features[zid] = {"name": info["name"], "features": feats}
        x = np.array([[feats[b] for b in FEATURE_ORDER]], dtype="float32")
        prob = float(rf.predict_proba(x)[0, 1])
        zone_baselines[zid] = {"name": info["name"], "score": round(prob, 4)}
        print(f"  {info['name']:25s}  score={prob:.3f}")

    (ARTIFACTS / "zone-features-static.json").write_text(
        json.dumps(zone_features, indent=2)
    )
    (ARTIFACTS / "zone-baseline-scores.json").write_text(
        json.dumps(zone_baselines, indent=2)
    )

    historical = historical_fires_per_zone(*TRAINING_YEARS)
    (ARTIFACTS / "historical-fires.json").write_text(
        json.dumps(
            {"zones": {zid: {"name": ZONES[zid]["name"], "by_year": yrs}
                       for zid, yrs in historical.items()},
             "training_period": f"{TRAINING_YEARS[0]}-{TRAINING_YEARS[1]}"},
            indent=2,
        )
    )

    # Update src/lib/model-output.json with REAL metrics
    model_output = {
        "model": "RandomForest",
        "n_trees": N_TREES,
        "accuracy": round(metrics["accuracy"], 4),
        "kappa": round(metrics["kappa"], 4),
        "precision": round(metrics["precision"], 4),
        "recall": round(metrics["recall"], 4),
        "f1": round(metrics["f1"], 4),
        "auc": round(metrics["auc"], 4),
        "confusion_matrix": metrics["confusion_matrix"],
        "samples": metrics["samples"],
        "feature_importance": metrics["feature_importance_pct"],
        "zone_risk_scores": {
            ZONES[zid]["name"]: zone_baselines[zid]["score"]
            for zid in ZONES
        },
        "training_period": f"{TRAINING_YEARS[0]}-{TRAINING_YEARS[1]}",
        "feature_year": FEATURE_YEAR,
        "feature_order": FEATURE_ORDER,
        "artifacts": {
            "sklearn_pkl": "ml/artifacts/fire_risk_rf.pkl",
            "onnx_available": onnx_ok,
            "onnx_path": "ml/artifacts/fire_risk_rf.onnx" if onnx_ok else None,
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "note": (
            "Real metrics from sklearn RandomForest on a "
            f"{metrics['samples']['validation']}-sample held-out validation set. "
            "Zone scores are predictions on the per-zone mean feature vector."
        ),
    }
    out_dashboard = ROOT / "src" / "lib" / "model-output.json"
    out_dashboard.write_text(json.dumps(model_output, indent=2))
    print(f"\n✓ Updated {out_dashboard.relative_to(ROOT)}")

    # Mirror runtime artifacts into src/lib/ml/ so Next.js can import them.
    runtime_dir = ROOT / "src" / "lib" / "ml"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    runtime_copies = [
        (trees_json_path, runtime_dir / "trees.json"),
        (ARTIFACTS / "zone-features-static.json", runtime_dir / "zone-features.json"),
        (ARTIFACTS / "feature_columns.json", runtime_dir / "feature-columns.json"),
        (ARTIFACTS / "historical-fires.json", runtime_dir / "historical-fires.json"),
    ]
    for src, dst in runtime_copies:
        dst.write_bytes(src.read_bytes())
    print(f"✓ Mirrored {len(runtime_copies)} runtime files → {runtime_dir.relative_to(ROOT)}")

    print("\n" + "=" * 72)
    print("  Done.")
    print(f"  Artifacts: {ARTIFACTS.relative_to(ROOT)}/")
    print(f"  Validation AUC: {metrics['auc']:.4f}  (target ≥ 0.80)")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
