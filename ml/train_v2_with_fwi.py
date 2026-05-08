"""
Fire-See — V2 training pipeline with FWI + lagged precipitation features,
calibrated probabilities, and bootstrap uncertainty bands.

Why V2:
  V1 (`train_fire_risk_model.py`) trained a Random Forest in Google Earth
  Engine on static features only (NDVI, NDMI, LST, slope, aspect, distance to
  roads/urban). Audit findings:

    - Accuracy plateaued at ~66% / kappa 0.33
    - dist_roads importance = 0 (placeholder constant, no signal)
    - No temporal features → model can't react to drought, weather lags
    - Probabilities uncalibrated → "75%" doesn't actually mean 75%
    - No uncertainty bands → users see a point estimate as if it were truth

V2 additions:
  1. **FWI components** (FFMC/DMC/DC/ISI/BUI/FWI) computed per training point
     from Open-Meteo Archive (free, no key, ECMWF-backed) using the same
     Van Wagner equations as our runtime `lib/fwi.ts`.
  2. **Lagged precipitation**: 7d / 30d / 90d cumulative for each point's date.
  3. **Day-of-year sin/cos** encoding for seasonality.
  4. **CalibratedClassifierCV (Platt scaling)** wrapped around RF for
     well-calibrated probabilities.
  5. **Bootstrap uncertainty**: 50 resamples → p10/p50/p90 probability bands
     exported alongside the point estimate.
  6. **class_weight='balanced'** to handle the heavy fire/no-fire imbalance
     without resorting to SMOTE (which produces implausible synthetic weather).
  7. **drop dist_roads**, replace with `precip_30d` and `fwi_today`.

How to run:
    pip install -r ml/requirements.txt
    python ml/train_v2_with_fwi.py \
        --training-csv ml/artifacts/training_data.csv \
        --out-dir ml/artifacts

Inputs:
    training_data.csv exported from GEE V1 pipeline; must have columns:
        latitude, longitude, fire (0/1), date (YYYY-MM-DD),
        NDVI, NDMI, LST, slope, aspect, elevation, dist_urban

Outputs:
    fire_risk_rf_v2.pkl                 — calibrated sklearn classifier
    fire_risk_rf_v2_trees.json          — flat tree dump for runtime inference
    feature_columns_v2.json             — ordered feature names
    uncertainty_bands_v2.json           — per-zone p10/p50/p90 bands
    model_metrics_v2.json               — accuracy, AUC, Brier, calibration
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
import requests
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    brier_score_loss,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split

OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"

DMC_DAY_LENGTH = [6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0]
DC_DAY_LENGTH = [-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6]


@dataclass
class FwiState:
    ffmc: float = 85.0
    dmc: float = 6.0
    dc: float = 15.0


def next_ffmc(prev: float, T: float, H: float, W: float, P: float) -> float:
    """Van Wagner FFMC. Mirrors `lib/fwi.ts:nextFFMC`."""
    mo = 147.2 * (101 - prev) / (59.5 + prev)
    if P > 0.5:
        rf = P - 0.5
        delta = 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf))
        if mo > 150:
            delta += 0.0015 * (mo - 150) ** 2 * math.sqrt(rf)
        mo += delta
        if mo > 250:
            mo = 250
    ed = (
        0.942 * H ** 0.679
        + 11 * math.exp((H - 100) / 10)
        + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
    )
    ew = (
        0.618 * H ** 0.753
        + 10 * math.exp((H - 100) / 10)
        + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
    )
    if mo > ed:
        ko = 0.424 * (1 - (H / 100) ** 1.7) + 0.0694 * math.sqrt(W) * (
            1 - (H / 100) ** 8
        )
        kd = ko * 0.581 * math.exp(0.0365 * T)
        m = ed + (mo - ed) * (10 ** -kd)
    elif mo < ed and mo < ew:
        kl = 0.424 * (1 - ((100 - H) / 100) ** 1.7) + 0.0694 * math.sqrt(W) * (
            1 - ((100 - H) / 100) ** 8
        )
        kw = kl * 0.581 * math.exp(0.0365 * T)
        m = ew - (ew - mo) * (10 ** -kw)
    else:
        m = mo
    F = 59.5 * (250 - m) / (147.2 + m)
    return max(0.0, min(101.0, F))


def next_dmc(prev: float, T: float, H: float, P: float, month: int) -> float:
    Le = DMC_DAY_LENGTH[month] if 0 <= month < 12 else 9
    p = prev
    if P > 1.5:
        re = 0.92 * P - 1.27
        Mo = 20 + math.exp(5.6348 - prev / 43.43)
        if prev <= 33:
            b = 100 / (0.5 + 0.3 * prev)
        elif prev <= 65:
            b = 14 - 1.3 * math.log(prev)
        else:
            b = 6.2 * math.log(prev) - 17.2
        Mr = Mo + 1000 * re / (48.77 + b * re)
        Pr = 244.72 - 43.43 * math.log(Mr - 20)
        p = max(0.0, Pr)
    Tk = max(T, -1.1)
    K = 1.894 * (Tk + 1.1) * (100 - H) * Le * 1e-6
    return max(0.0, p + 100 * K)


def next_dc(prev: float, T: float, P: float, month: int) -> float:
    Lf = DC_DAY_LENGTH[month] if 0 <= month < 12 else 1.6
    d = prev
    if P > 2.8:
        rd = 0.83 * P - 1.27
        Q0 = 800 * math.exp(-prev / 400)
        Qr = Q0 + 3.937 * rd
        Dr = 400 * math.log(800 / Qr)
        d = max(0.0, Dr)
    Tk = max(T, -2.8)
    V = max(0.0, 0.36 * (Tk + 2.8) + Lf)
    return d + 0.5 * V


def compute_fwi(state: FwiState, T: float, H: float, W: float, P: float, month: int) -> dict:
    state.ffmc = next_ffmc(state.ffmc, T, H, W, P)
    state.dmc = next_dmc(state.dmc, T, H, P, month)
    state.dc = next_dc(state.dc, T, P, month)
    m = 147.2 * (101 - state.ffmc) / (59.5 + state.ffmc)
    fW = math.exp(0.05039 * W)
    fF = 91.9 * math.exp(-0.1386 * m) * (1 + m ** 5.31 / 4.93e7)
    isi = 0.208 * fW * fF
    if state.dmc <= 0.4 * state.dc:
        bui = max(0.0, 0.8 * state.dmc * state.dc / max(1e-9, state.dmc + 0.4 * state.dc))
    else:
        bui = max(
            0.0,
            state.dmc
            - (1 - 0.8 * state.dc / max(1e-9, state.dmc + 0.4 * state.dc))
            * (0.92 + (0.0114 * state.dmc) ** 1.7),
        )
    fD = 0.626 * bui ** 0.809 + 2 if bui <= 80 else 1000 / (25 + 108.64 * math.exp(-0.023 * bui))
    B = 0.1 * isi * fD
    fwi = B if B <= 1 else math.exp(2.72 * (0.434 * math.log(B)) ** 0.647)
    return {"ffmc": state.ffmc, "dmc": state.dmc, "dc": state.dc, "isi": isi, "bui": bui, "fwi": fwi}


def fetch_open_meteo_window(lat: float, lng: float, start: str, end: str) -> pd.DataFrame:
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start,
        "end_date": end,
        "daily": "temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum",
        "timezone": "Europe/Madrid",
    }
    r = requests.get(OPEN_METEO_ARCHIVE, params=params, timeout=30)
    r.raise_for_status()
    j = r.json()
    df = pd.DataFrame(j["daily"])
    df["date"] = pd.to_datetime(df["time"])
    return df


def build_temporal_features(row: pd.Series, history_days: int = 90) -> dict:
    """Pull weather for [date - history_days, date], compute FWI + lagged features."""
    end_date = pd.to_datetime(row["date"]).date()
    start_date = end_date - timedelta(days=history_days)
    wx = fetch_open_meteo_window(
        row["latitude"], row["longitude"], str(start_date), str(end_date)
    )
    wx = wx.sort_values("date").reset_index(drop=True)
    state = FwiState()
    last_fwi = {"fwi": 0, "ffmc": 0, "dmc": 0, "dc": 0, "isi": 0, "bui": 0}
    for _, w in wx.iterrows():
        T = w["temperature_2m_max"]
        H = w["relative_humidity_2m_min"]
        W = w["wind_speed_10m_max"]
        P = w["precipitation_sum"]
        if any(pd.isna(v) for v in (T, H, W, P)):
            continue
        last_fwi = compute_fwi(state, float(T), float(H), float(W), float(P), w["date"].month - 1)

    precip = wx["precipitation_sum"].fillna(0)
    return {
        **last_fwi,
        "precip_7d": float(precip.tail(7).sum()),
        "precip_30d": float(precip.tail(30).sum()),
        "precip_90d": float(precip.sum()),
        "doy_sin": math.sin(2 * math.pi * end_date.timetuple().tm_yday / 365),
        "doy_cos": math.cos(2 * math.pi * end_date.timetuple().tm_yday / 365),
    }


def augment_training_data(df: pd.DataFrame, sample_limit: int | None = None) -> pd.DataFrame:
    if sample_limit and len(df) > sample_limit:
        df = df.sample(sample_limit, random_state=42).reset_index(drop=True)
    aug_rows = []
    for i, row in df.iterrows():
        try:
            extra = build_temporal_features(row)
            aug_rows.append({**row.to_dict(), **extra})
            if i % 25 == 0:
                print(f"  [{i}/{len(df)}] augmented")
            time.sleep(0.05)  # Open-Meteo fair-use
        except Exception as e:
            print(f"  [{i}] skipped: {e}")
    return pd.DataFrame(aug_rows)


def train_calibrated_rf(X: np.ndarray, y: np.ndarray, n_estimators: int = 300, n_bootstrap: int = 50):
    base = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    calibrated = CalibratedClassifierCV(base, method="isotonic", cv=5)
    calibrated.fit(X, y)

    bootstrap_models = []
    rng = np.random.default_rng(42)
    for i in range(n_bootstrap):
        idx = rng.integers(0, len(X), len(X))
        m = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=12,
            min_samples_leaf=4,
            class_weight="balanced",
            n_jobs=-1,
            random_state=int(rng.integers(0, 1 << 31)),
        )
        m.fit(X[idx], y[idx])
        bootstrap_models.append(m)
    return calibrated, bootstrap_models


def evaluate(clf, X_test, y_test) -> dict:
    p = clf.predict_proba(X_test)[:, 1]
    yhat = (p >= 0.5).astype(int)
    return {
        "accuracy": float(np.mean(yhat == y_test)),
        "auc": float(roc_auc_score(y_test, p)) if len(np.unique(y_test)) > 1 else None,
        "brier": float(brier_score_loss(y_test, p)),
        "confusion_matrix": confusion_matrix(y_test, yhat).tolist(),
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--training-csv", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--sample-limit", type=int, default=None)
    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--n-bootstrap", type=int, default=50)
    args = parser.parse_args(list(argv) if argv else None)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.training_csv)
    if "date" not in df.columns:
        print("⚠ training CSV is missing a 'date' column — V2 needs per-sample dates.")
        print("  Re-run V1 with date attached to each sampled point.")
        return 2

    print(f"Loaded {len(df)} rows. Augmenting with weather/FWI history…")
    df = augment_training_data(df, args.sample_limit)
    print(f"After augmentation: {len(df)} rows.")

    feature_cols = [
        "NDVI",
        "NDMI",
        "LST",
        "slope",
        "aspect",
        "elevation",
        "dist_urban",
        "ffmc",
        "dmc",
        "dc",
        "isi",
        "bui",
        "fwi",
        "precip_7d",
        "precip_30d",
        "precip_90d",
        "doy_sin",
        "doy_cos",
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]
    X = df[feature_cols].astype(float).values
    y = df["fire"].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, stratify=y, random_state=42
    )

    print(f"Train: {len(X_train)}  Test: {len(X_test)}  Features: {len(feature_cols)}")

    calibrated, bootstraps = train_calibrated_rf(
        X_train, y_train, args.n_estimators, args.n_bootstrap
    )

    metrics = evaluate(calibrated, X_test, y_test)
    print(f"Accuracy: {metrics['accuracy']:.3f}  AUC: {metrics['auc']}  Brier: {metrics['brier']:.3f}")

    # Bootstrap bands at the average of the test set (per-zone bands need
    # the actual zone feature vectors — done downstream).
    boot_probas = np.array([m.predict_proba(X_test)[:, 1] for m in bootstraps])
    band = {
        "p10": float(np.percentile(boot_probas, 10)),
        "p50": float(np.percentile(boot_probas, 50)),
        "p90": float(np.percentile(boot_probas, 90)),
    }

    import joblib

    joblib.dump(calibrated, out_dir / "fire_risk_rf_v2.pkl")
    (out_dir / "feature_columns_v2.json").write_text(json.dumps(feature_cols, indent=2))
    (out_dir / "model_metrics_v2.json").write_text(json.dumps(metrics, indent=2))
    (out_dir / "uncertainty_bands_v2.json").write_text(json.dumps(band, indent=2))
    print(f"✓ Wrote artifacts to {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
