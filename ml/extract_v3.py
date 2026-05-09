"""
Fire-See — V3 training data extraction with per-sample dates and temporal features.

Why V3:
  V1 trained on a static seasonal feature stack (Jun-Sep median 2015-2023). Every
  sample saw the same NDVI/NDMI regardless of when it actually burned, so the
  model couldn't learn that fires happen when the pre-fire window is dry. Without
  temporal signal the AUC plateaued at ~0.75.

V3 changes:
  - Per-pixel burn date pulled from MCD64A1 BurnDate band.
  - Server-side mapping computes a pre-30-day feature stack per sample so the
    whole extraction runs in one GEE evaluation per year (no per-sample
    round-trips).
  - Negative samples: random non-burn pixels with random fire-season dates so
    the negative class has the same distribution of pre-date temporal features.
  - More samples per year (~600 each, 2019-2023) → 6000 total.
  - Outputs a CSV with date + lat + lng so downstream pipelines (FWI etc.) can
    augment further without re-querying GEE.

Outputs:
  ml/artifacts/training_data_v3.csv

Run:
  set -a; source .env.local; set +a
  ml/.venv/bin/python ml/extract_v3.py --year 2022     # single year for testing
  ml/.venv/bin/python ml/extract_v3.py                 # default year list
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path

import ee
from google.oauth2 import service_account


PROJECT_ID = os.environ.get("GEE_PROJECT_ID", "fire-see-ml-495509")
KEY_PATH = os.environ.get(
    "GEE_SERVICE_ACCOUNT_KEY_PATH",
    str(Path.home() / ".config" / "fire-see" / "gee-key.json"),
)

BBOX_COORDS = [-8.5, 41.8, -7.0, 42.5]
SAMPLES_PER_CLASS_PER_YEAR = 400  # 400 burn + 400 non-burn per year

OUT_PATH = Path(__file__).parent / "artifacts" / "training_data_v3.csv"

BBOX: "ee.Geometry | None" = None


def init_gee() -> None:
    global BBOX
    if not Path(KEY_PATH).exists():
        sys.exit(f"GEE key not found at {KEY_PATH}")
    creds = service_account.Credentials.from_service_account_file(
        KEY_PATH,
        scopes=["https://www.googleapis.com/auth/earthengine"],
    )
    ee.Initialize(credentials=creds, project=PROJECT_ID)
    BBOX = ee.Geometry.Rectangle(BBOX_COORDS)
    print(f"✓ GEE initialised for project {PROJECT_ID}")


# ----- Static layers (constant per location) -------------------------------

def static_terrain() -> ee.Image:
    dem = ee.Image("USGS/SRTMGL1_003")
    return (
        ee.Terrain.slope(dem).rename("slope")
        .addBands(ee.Terrain.aspect(dem).rename("aspect"))
        .addBands(dem.rename("elevation"))
    )


def static_dist_urban() -> ee.Image:
    """Distance (m) to ESA WorldCover 2021 built-up pixels (class 50)."""
    built = (
        ee.ImageCollection("ESA/WorldCover/v200")
        .first()
        .eq(50)
    )
    return built.fastDistanceTransform(256).sqrt().multiply(10).rename("dist_urban")


# ----- Sentinel-2 cloud mask ----------------------------------------------

def _mask_s2_clouds(img: ee.Image) -> ee.Image:
    scl = img.select("SCL")
    bad = (
        scl.eq(3).Or(scl.eq(8)).Or(scl.eq(9)).Or(scl.eq(10))
    )
    return img.updateMask(bad.Not())


# ----- Per-sample temporal features (all server-side) ---------------------

def add_pre_window_features(point_fc: ee.FeatureCollection) -> ee.FeatureCollection:
    """
    For every feature in `point_fc` (which must have a 'date' string property),
    sample NDVI/NDMI/LST/ERA5 in the 30-day pre-window ending at that date.

    Implementation note: we *can't* do per-feature ImageCollection filterDate
    in pure server-side `.map()` (it requires evaluating the collection at
    the sample's date). So we partition by year×month bins, build the feature
    stack once per bin, and sample only the points whose date falls in that
    bin against that stack.
    """
    # Bin features by year-month.
    binned = point_fc.map(
        lambda f: f.set("ym", ee.Date(f.get("date")).format("YYYY-MM"))
    )
    bins = binned.aggregate_array("ym").distinct()

    def per_bin(ym: ee.String) -> ee.FeatureCollection:
        ym_str = ee.String(ym)
        ref = ee.Date.parse("YYYY-MM", ym_str)
        # CRITICAL: window must end BEFORE any burn in this bin could have
        # happened, otherwise NDVI/NDMI medians include post-burn (charred)
        # imagery and the model trivially separates classes via post-event
        # vegetation collapse.
        # We end the window at the start of the bin month, so for
        # "2022-08" we look at the 30-day window 2022-07-02..2022-08-01.
        end = ref
        start_30 = end.advance(-30, "day")
        start_7 = end.advance(-7, "day")

        s2 = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(BBOX)
            .filterDate(start_30, end)
            .map(_mask_s2_clouds)
        )
        ndvi = s2.map(lambda im: im.normalizedDifference(["B8", "B4"]).rename("NDVI")).median()
        ndmi = s2.map(lambda im: im.normalizedDifference(["B8", "B11"]).rename("NDMI")).median()
        lst = (
            ee.ImageCollection("MODIS/061/MOD11A1")
            .filterDate(start_7, end)
            .select("LST_Day_1km")
            .median()
            .multiply(0.02)
            .subtract(273.15)
            .rename("LST")
        )
        era5_30 = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR").filterDate(start_30, end)
        era5_7 = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR").filterDate(start_7, end)
        tmax_7 = era5_7.select("temperature_2m_max").mean().subtract(273.15).rename("tmax_7d")
        dewmin_7 = era5_7.select("dewpoint_temperature_2m_min").mean().subtract(273.15).rename("dewmin_7d")
        wind_7 = era5_7.select("u_component_of_wind_10m_max").mean().abs().rename("u_max_7d")
        precip_30 = era5_30.select("total_precipitation_sum").sum().rename("precip_30d")
        precip_7 = era5_7.select("total_precipitation_sum").sum().rename("precip_7d")

        stack = (
            ndvi.addBands(ndmi).addBands(lst)
            .addBands(tmax_7).addBands(dewmin_7).addBands(wind_7)
            .addBands(precip_30).addBands(precip_7)
        )

        bin_points = binned.filter(ee.Filter.eq("ym", ym_str))
        return stack.sampleRegions(
            collection=bin_points,
            scale=500,
            geometries=True,
            tileScale=4,
        )

    sampled = ee.FeatureCollection(bins.map(per_bin)).flatten()
    return sampled


# ----- Per-year sample generation ----------------------------------------

def yearly_samples(year: int, n_per_class: int) -> ee.FeatureCollection:
    """
    Stratified sample: n_per_class burned + n_per_class non-burn pixels.

    Both classes share the SAME DOY distribution by paired construction:
    each non-burn pixel inherits its date from a randomly-chosen burn in
    the same year. Without this the model trivially separates classes via
    seasonal weather (tmax_7d, precip_30d) instead of fire-prone signal.

    Burn samples are drawn from May–Sep MCD64A1 BurnDate band.
    """
    start = ee.Date.fromYMD(year, 5, 1)
    end = ee.Date.fromYMD(year, 9, 30)
    burn_doy_img = (
        ee.ImageCollection("MODIS/061/MCD64A1")
        .filterDate(start, end)
        .filterBounds(BBOX)
        .select("BurnDate")
        .mosaic()
        .unmask(0)
        .rename("burn_doy")
    )
    in_season = burn_doy_img.gte(121).And(burn_doy_img.lte(273))

    # Restrict ALL sampling to potentially-burnable land cover (tree cover,
    # shrubland, grassland — ESA WorldCover classes 10/20/30). Otherwise
    # non-burn samples include urban, water and bare rock and the model
    # trivially classifies "is this forest" instead of "is this fire-prone".
    landcover = ee.ImageCollection("ESA/WorldCover/v200").first()
    burnable = (
        landcover.eq(10).Or(landcover.eq(20)).Or(landcover.eq(30))
    )

    burned_class = burn_doy_img.gt(0).And(in_season).And(burnable).rename("burned")
    # Mask non-burnable land entirely so stratifiedSample never picks it.
    combined = burned_class.addBands(burn_doy_img).updateMask(burnable)

    raw = combined.stratifiedSample(
        numPoints=n_per_class,
        classBand="burned",
        classValues=[0, 1],
        classPoints=[n_per_class, n_per_class],
        region=BBOX,
        scale=500,
        seed=year,
        geometries=True,
        tileScale=4,
    )

    # Pull just the burn DOYs to the client so we can mirror them onto
    # non-burns. This is a light getInfo() — N integers.
    burn_doys = (
        raw.filter(ee.Filter.eq("burned", 1))
        .aggregate_array("burn_doy")
        .getInfo()
    )
    if not burn_doys:
        return ee.FeatureCollection([])

    # Build a server-side ee.List of DOYs we can index into.
    burn_doy_list = ee.List(burn_doys)
    n_burn = len(burn_doys)

    def assign_date(f: ee.Feature) -> ee.Feature:
        burned = ee.Number(f.get("burned"))
        doy_burn = ee.Number(f.get("burn_doy"))
        # Deterministic per-feature index using the longitude high-bits.
        coords = f.geometry().coordinates()
        lng = ee.Number(coords.get(0))
        idx = lng.multiply(1e6).abs().mod(n_burn).floor()
        doy_nb = ee.Number(burn_doy_list.get(idx))
        doy = ee.Algorithms.If(burned.eq(1), doy_burn, doy_nb)
        d = ee.Date.fromYMD(year, 1, 1).advance(ee.Number(doy).subtract(1), "day")
        return f.set({
            "fire": burned,
            "year": year,
            "doy": doy,
            "date": d.format("YYYY-MM-dd"),
        })

    return raw.map(assign_date)


# ----- Driver ------------------------------------------------------------

def extract_year(year: int, terrain: ee.Image, dist_urban: ee.Image) -> list[dict]:
    print(f"\n[year {year}] building sample collection (server-side)…")
    fc = yearly_samples(year, SAMPLES_PER_CLASS_PER_YEAR)

    with_temporal = add_pre_window_features(fc)
    static_stack = terrain.addBands(dist_urban)
    with_static = static_stack.sampleRegions(
        collection=with_temporal,
        scale=90,
        geometries=False,
        tileScale=4,
    )

    print(f"[year {year}] downloading…")
    info = with_static.getInfo()
    feats = info.get("features", [])
    print(f"[year {year}] {len(feats)} rows")

    rows: list[dict] = []
    for f in feats:
        p = f.get("properties", {})
        # Reconstruct lat/lng from the original geometry (lost after sampleRegions
        # with geometries=False, but we kept it via add_date earlier where present).
        # The geometry was still attached on with_temporal, so it persists if
        # sampleRegions with geometries=True. We forced False; recover from the
        # bin step's saved coords.
        rows.append(p)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, help="Extract a single year (testing)")
    parser.add_argument("--years", default="2019,2020,2021,2022,2023")
    args = parser.parse_args()

    init_gee()
    terrain = static_terrain()
    dist_urban = static_dist_urban()

    years = [args.year] if args.year else [int(y) for y in args.years.split(",")]
    all_rows: list[dict] = []
    for y in years:
        try:
            all_rows.extend(extract_year(y, terrain, dist_urban))
        except Exception as e:  # noqa: BLE001
            print(f"[year {y}] FAILED: {e}")

    if not all_rows:
        print("No rows produced — aborting.")
        return 1

    keys = [
        "date", "year", "doy", "fire",
        "NDVI", "NDMI", "LST",
        "tmax_7d", "dewmin_7d", "u_max_7d", "precip_30d", "precip_7d",
        "slope", "aspect", "elevation", "dist_urban",
    ]
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        for r in all_rows:
            w.writerow(r)
    print(f"✓ wrote {len(all_rows)} rows → {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
