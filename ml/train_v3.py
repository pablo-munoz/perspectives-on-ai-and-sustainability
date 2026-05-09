"""
Fire-See — V3 final training and export.

Train an RF on the V3 dataset (per-event 30-day pre-burn NDVI/NDMI/LST + terrain
+ dist_urban), with FireSeason May–Sep, paired DOY between burned and non-burned
classes, and burnable-only land cover. Drops `dist_roads` (V1 placeholder, 0 importance).

Outputs:
  ml/artifacts/training_data_v3.csv     (input — produced by extract_v3.py)
  ml/artifacts/fire_risk_rf_v3_trees.json
  ml/artifacts/feature_columns_v3.json
  ml/artifacts/zone-features-static-v3.json   (V1 features minus dist_roads)
  src/lib/ml/trees.json                 (deployed)
  src/lib/ml/feature-columns.json       (deployed)
  src/lib/ml/zone-features.json         (deployed)
  src/lib/model-output.json             (model card metrics)

Run:
  ml/.venv/bin/python ml/train_v3.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold, StratifiedKFold


ROOT = Path(__file__).resolve().parents[1]
ARTIF = ROOT / "ml" / "artifacts"
LIB = ROOT / "src" / "lib" / "ml"
DATA_CSV = ARTIF / "training_data_v3.csv"

FEATURE_ORDER = [
    "NDVI",
    "NDMI",
    "LST",
    "slope",
    "aspect",
    "elevation",
    "dist_urban",
]

RF_PARAMS = dict(
    n_estimators=200,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
)


# ----- Tree export (same format as V1) -----------------------------------

def export_trees_json(rf: RandomForestClassifier, out_path: Path) -> None:
    print(f"→ Serializing trees → {out_path.name}")
    trees_data = []
    for est in rf.estimators_:
        t = est.tree_
        values = t.value[:, 0, :]
        totals = values.sum(axis=1)
        safe = np.where(totals > 0, totals, 1.0)
        leaf_prob = (values[:, 1] / safe).astype(float).tolist()
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
    print(f"  ✓ {out_path.stat().st_size // 1024} KB · {len(trees_data)} trees")


# ----- Per-zone feature update -------------------------------------------

def rebuild_zone_features(src: Path, dst: Path) -> None:
    """Strip `dist_roads` from existing zone-features so it matches V3 order."""
    zones = json.loads(src.read_text())
    cleaned = {}
    for zid, rec in zones.items():
        feats = {k: v for k, v in rec["features"].items() if k != "dist_roads"}
        cleaned[zid] = {"name": rec["name"], "features": feats}
    dst.write_text(json.dumps(cleaned, indent=2))
    print(f"  ✓ {dst.relative_to(ROOT)}")


# ----- Driver ------------------------------------------------------------

def main() -> int:
    if not DATA_CSV.exists():
        sys.exit(f"Missing {DATA_CSV}. Run extract_v3.py first.")

    df = pd.read_csv(DATA_CSV)
    print(f"Loaded {len(df)} rows across years {sorted(df.year.unique().tolist())}")
    print(f"Class balance: {df.fire.value_counts().to_dict()}")

    X = df[FEATURE_ORDER].values
    y = df.fire.values
    years = df.year.values

    # === Cross-validation diagnostics ===
    rf = RandomForestClassifier(**RF_PARAMS)
    rcv = StratifiedKFold(5, shuffle=True, random_state=42)
    aucs_random = []
    accs_random = []
    for tr, te in rcv.split(X, y):
        rf.fit(X[tr], y[tr])
        p = rf.predict_proba(X[te])[:, 1]
        aucs_random.append(roc_auc_score(y[te], p))
        accs_random.append(accuracy_score(y[te], (p >= 0.5).astype(int)))
    auc_random = float(np.mean(aucs_random))
    acc_random = float(np.mean(accs_random))

    aucs_group = []
    if df.year.nunique() > 1:
        gkf = GroupKFold(n_splits=df.year.nunique())
        for tr, te in gkf.split(X, y, groups=years):
            rf.fit(X[tr], y[tr])
            p = rf.predict_proba(X[te])[:, 1]
            if len(np.unique(y[te])) > 1:
                aucs_group.append(roc_auc_score(y[te], p))
    auc_group = float(np.mean(aucs_group)) if aucs_group else None

    print(f"\nRandom 5-fold CV:")
    print(f"  AUC      = {auc_random:.4f}")
    print(f"  Accuracy = {acc_random:.4f}")
    if auc_group is not None:
        print(f"\nLeave-one-year-out CV (cross-year transfer):")
        print(f"  AUC      = {auc_group:.4f}")
        print(f"  per-fold = {[f'{a:.3f}' for a in aucs_group]}")

    # === Final model on all data ===
    print("\n→ Fitting final model on full dataset…")
    rf_final = RandomForestClassifier(**RF_PARAMS).fit(X, y)

    # Feature importance
    imp = dict(zip(FEATURE_ORDER, [round(float(v) * 100, 4) for v in rf_final.feature_importances_]))
    imp = dict(sorted(imp.items(), key=lambda kv: kv[1], reverse=True))

    # === Export trees ===
    ARTIF.mkdir(parents=True, exist_ok=True)
    LIB.mkdir(parents=True, exist_ok=True)

    export_trees_json(rf_final, ARTIF / "fire_risk_rf_v3_trees.json")
    export_trees_json(rf_final, LIB / "trees.json")

    (ARTIF / "feature_columns_v3.json").write_text(json.dumps(FEATURE_ORDER, indent=2))
    (LIB / "feature-columns.json").write_text(json.dumps(FEATURE_ORDER, indent=2))

    rebuild_zone_features(
        ARTIF / "zone-features-static.json",
        ARTIF / "zone-features-static-v3.json",
    )
    rebuild_zone_features(
        ARTIF / "zone-features-static.json",
        LIB / "zone-features.json",
    )

    # === Model card (backward-compatible flat shape consumed by /api/model) ===
    # Per-zone score = mean predicted probability over training points
    # whose centroid falls within the zone polygon. We approximate by using
    # the existing static feature vectors and predicting once.
    zone_features_path = ARTIF / "zone-features-static.json"
    zone_static = json.loads(zone_features_path.read_text())
    zone_scores: dict[str, float] = {}
    for zid, rec in zone_static.items():
        vec = np.array([[rec["features"].get(f, 0.0) for f in FEATURE_ORDER]])
        zone_scores[zid] = round(float(rf_final.predict_proba(vec)[0, 1]), 4)

    # Confusion matrix at threshold 0.5 on the random 5-fold held-out predictions.
    # Using full-data CM would be over-optimistic; use the held-out predictions
    # collected in the CV loop above (rebuild here for clarity).
    aucs_random = []
    accs_random = []
    cm_total = np.zeros((2, 2), dtype=int)
    rcv2 = StratifiedKFold(5, shuffle=True, random_state=42)
    for tr, te in rcv2.split(X, y):
        rf2 = RandomForestClassifier(**RF_PARAMS).fit(X[tr], y[tr])
        p = rf2.predict_proba(X[te])[:, 1]
        yhat = (p >= 0.5).astype(int)
        aucs_random.append(roc_auc_score(y[te], p))
        accs_random.append(accuracy_score(y[te], yhat))
        cm_total += confusion_matrix(y[te], yhat)
    cm_holdout = cm_total.tolist()

    auc_holdout = float(np.mean(aucs_random))
    acc_holdout = float(np.mean(accs_random))
    tn, fp = cm_holdout[0]
    fn, tp = cm_holdout[1]
    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0
    kappa_h = cohen_kappa_score(y, np.zeros_like(y))  # placeholder; recompute properly below

    # Kappa on held-out predictions across folds.
    yhat_oof = np.zeros_like(y)
    for tr, te in rcv2.split(X, y):
        rf2 = RandomForestClassifier(**RF_PARAMS).fit(X[tr], y[tr])
        yhat_oof[te] = (rf2.predict_proba(X[te])[:, 1] >= 0.5).astype(int)
    kappa_h = float(cohen_kappa_score(y, yhat_oof))

    flat = {
        "model": "RandomForestV3",
        "n_trees": RF_PARAMS["n_estimators"],
        "version": "3.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "training_period": "2018-2022 fire seasons (May–Sep)",
        "feature_year": 2022,
        # Headline metrics (random 5-fold CV — same metric V1 reported as 0.74).
        "accuracy": round(acc_holdout, 4),
        "kappa": round(kappa_h, 4),
        "auc": round(auc_holdout, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "auc_leave_one_year_out": round(auc_group, 4) if auc_group is not None else None,
        "feature_importance": imp,
        "confusion_matrix": cm_holdout,
        "zone_risk_scores": zone_scores,
        "samples": {
            "total": int(len(df)),
            "positive": int((df.fire == 1).sum()),
            "negative": int((df.fire == 0).sum()),
            "training": int(len(df) * 0.8),
            "validation": int(len(df) * 0.2),
        },
        "rf_params": {k: v for k, v in RF_PARAMS.items() if k != "n_jobs"},
        "features": FEATURE_ORDER,
        "data_source": "MODIS MCD64A1 burned-area + ESA WorldCover burnable mask + Sentinel-2 NDVI/NDMI + MODIS LST + ERA5 (excluded from final model)",
        "note": "V3 — per-event 30-day pre-burn windows, paired DOY between classes, burnable land cover only. Volatile per-event weather features were tested but dropped: they boosted within-year AUC to 0.99 by encoding year identity instead of fire risk.",
    }
    out = ROOT / "src" / "lib" / "model-output.json"
    out.write_text(json.dumps(flat, indent=2))
    print(f"  ✓ {out.relative_to(ROOT)}")

    print(f"\n✓ V3 model deployed. Headline AUC: {auc_random:.4f} (random 5-fold)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
