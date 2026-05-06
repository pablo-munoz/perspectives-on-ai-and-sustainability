"""
Fire-See — daily feature refresh.

Computes per-zone mean NDVI / NDMI / LST from recent GEE imagery and pushes
the snapshots to Upstash Redis under `features:zone:{zoneId}`. The Next.js
risk engine reads those keys to override the static training-time feature
vectors, producing scores that reflect current vegetation/temperature.

Run on a schedule (e.g. GitHub Actions or a laptop cron) after training has
populated the static artifacts. Designed to be idempotent and safe to retry.

Usage:
    cd ml
    source .venv/bin/activate
    set -a; source ../.env.local; set +a
    python refresh_features.py

Environment:
    GEE_SERVICE_ACCOUNT_KEY_PATH   GEE service-account JSON
    GEE_PROJECT_ID                 GEE Cloud project id
    UPSTASH_REDIS_REST_URL         e.g. https://xxx.upstash.io
    UPSTASH_REDIS_REST_TOKEN
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import ee
from google.oauth2 import service_account
import requests


PROJECT_ID = os.environ.get("GEE_PROJECT_ID", "fire-see-ml-495509")
KEY_PATH = os.environ.get(
    "GEE_SERVICE_ACCOUNT_KEY_PATH",
    str(Path.home() / ".config" / "fire-see" / "gee-key.json"),
)
UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

WINDOW_DAYS = int(os.environ.get("FEATURE_WINDOW_DAYS", "21"))
TTL_SECONDS = int(os.environ.get("FEATURE_TTL_SECONDS", str(7 * 24 * 3600)))

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


def init_ee() -> None:
    if not Path(KEY_PATH).exists():
        sys.exit(f"✗ Service account key not found at {KEY_PATH}")
    creds = service_account.Credentials.from_service_account_file(
        KEY_PATH,
        scopes=[
            "https://www.googleapis.com/auth/earthengine",
            "https://www.googleapis.com/auth/cloud-platform",
        ],
    )
    ee.Initialize(credentials=creds, project=PROJECT_ID)


def zone_geom(zid: str) -> ee.Geometry:
    return ee.Geometry.Rectangle(ZONES[zid]["bbox"])


def s2_index_mean(zid: str, kind: str) -> float | None:
    """Mean NDVI ('nd' from B8/B4) or NDMI ('nd' from B8/B11) over the bbox."""
    end = datetime.utcnow().date()
    start = end - timedelta(days=WINDOW_DAYS)
    bands = ("B8", "B4") if kind == "NDVI" else ("B8", "B11")

    coll = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(zone_geom(zid))
        .filterDate(str(start), str(end))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
    )
    image = coll.median().normalizedDifference(list(bands)).rename("nd")
    stats = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=zone_geom(zid),
        scale=30,
        maxPixels=int(1e8),
    ).getInfo()
    v = stats.get("nd")
    return float(v) if v is not None else None


def lst_mean(zid: str) -> float | None:
    """Mean MODIS LST_Day_1km in °C over the window."""
    end = datetime.utcnow().date()
    start = end - timedelta(days=WINDOW_DAYS)
    coll = (
        ee.ImageCollection("MODIS/061/MOD11A1")
        .filterBounds(zone_geom(zid))
        .filterDate(str(start), str(end))
        .select("LST_Day_1km")
    )
    image = coll.mean().multiply(0.02).subtract(273.15).rename("lst")
    stats = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=zone_geom(zid),
        scale=1000,
        maxPixels=int(1e8),
    ).getInfo()
    v = stats.get("lst")
    return float(v) if v is not None else None


def upstash_set(key: str, value: dict, ex: int) -> None:
    """SET key value EX seconds via Upstash REST API."""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        sys.exit("✗ UPSTASH_REDIS_REST_URL / TOKEN missing")
    url = f"{UPSTASH_URL}/set/{key}"
    headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
    # Upstash REST set with EX: pass body as JSON string and EX as query param.
    res = requests.post(
        url,
        headers=headers,
        params={"EX": ex},
        data=json.dumps(value),
        timeout=20,
    )
    res.raise_for_status()


def main() -> int:
    print("=" * 60)
    print("  Fire-See — refresh GEE features → Upstash")
    print("=" * 60)
    init_ee()
    print(f"✓ GEE ready · window={WINDOW_DAYS}d · TTL={TTL_SECONDS}s")

    started = time.time()
    summary = {"refreshed": 0, "errors": 0, "results": {}}

    for zid, info in ZONES.items():
        print(f"\n→ {info['name']} ({zid})")
        try:
            ndvi = s2_index_mean(zid, "NDVI")
            ndmi = s2_index_mean(zid, "NDMI")
            lst = lst_mean(zid)
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ {exc.__class__.__name__}: {exc}")
            summary["errors"] += 1
            summary["results"][zid] = {"ok": False, "error": str(exc)}
            continue

        snap = {
            "zoneId": zid,
            "ndvi": ndvi,
            "ndmi": ndmi,
            "lst": lst,
            "asOf": datetime.utcnow().isoformat() + "Z",
        }
        try:
            upstash_set(f"features:zone:{zid}", snap, TTL_SECONDS)
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ KV write failed: {exc}")
            summary["errors"] += 1
            summary["results"][zid] = {"ok": False, "error": str(exc)}
            continue

        print(f"  ✓ NDVI={fmt(ndvi)} NDMI={fmt(ndmi)} LST={fmt(lst)} °C")
        summary["refreshed"] += 1
        summary["results"][zid] = {"ok": True, **snap}

    summary["finishedAt"] = datetime.utcnow().isoformat() + "Z"
    summary["durationSeconds"] = round(time.time() - started, 2)
    upstash_set("features:meta:lastRun", summary, 30 * 24 * 3600)

    print("\n" + "=" * 60)
    print(
        f"  Refreshed {summary['refreshed']} / {len(ZONES)} zones in {summary['durationSeconds']}s"
    )
    print("=" * 60)
    return 0 if summary["errors"] == 0 else 2


def fmt(v: float | None) -> str:
    return f"{v:.3f}" if isinstance(v, (int, float)) else "—"


if __name__ == "__main__":
    sys.exit(main())
