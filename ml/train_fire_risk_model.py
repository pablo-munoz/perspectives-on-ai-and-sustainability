"""
Fire Watch Ourense — Random Forest Fire Risk Model
===================================================
Google Earth Engine (GEE) training pipeline for wildfire susceptibility mapping.

This script trains a Random Forest classifier using satellite and terrain data
to predict fire risk across the Ourense province, Galicia, Spain.

Requirements:
    - Google Earth Engine Python API (pip install earthengine-api)
    - Authenticated GEE account (earthengine authenticate)

Usage:
    python train_fire_risk_model.py

    Or run in Google Colab with:
    !pip install earthengine-api
    import ee
    ee.Authenticate()
    ee.Initialize(project='your-project-id')

Reference Paper:
    Piao et al. (2022). Forest fire susceptibility assessment using Google Earth
    Engine in Gangwon-do, Republic of Korea. Geomatics, Natural Hazards and Risk.
    Target AUC: >= 0.80 (reference achieved 0.835)

Authors: Fire Watch Ourense Team — ESADE 2026
"""

import ee
import json
import os
from datetime import datetime

# ============================================================================
# 1. INITIALIZATION
# ============================================================================

def initialize_gee(project_id=None):
    """Initialize Google Earth Engine."""
    try:
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()
        print("✓ Google Earth Engine initialized successfully")
    except Exception:
        print("Authenticating with Google Earth Engine...")
        ee.Authenticate()
        ee.Initialize(project=project_id)
        print("✓ Authenticated and initialized")


# ============================================================================
# 2. STUDY AREA DEFINITION
# ============================================================================

def get_ourense_boundary():
    """
    Define the Ourense province boundary.
    Uses FAO GAUL administrative boundaries dataset.
    """
    # Ourense province bounding box (approximate)
    ourense_bbox = ee.Geometry.Rectangle([-8.5, 41.8, -7.0, 42.5])

    # Try to get exact administrative boundary
    try:
        gaul = ee.FeatureCollection("FAO/GAUL/2015/level2")
        ourense = gaul.filter(ee.Filter.eq("ADM2_NAME", "Ourense"))

        # Check if we found the boundary
        count = ourense.size().getInfo()
        if count > 0:
            print(f"✓ Found Ourense boundary from GAUL ({count} features)")
            return ourense.geometry()
    except Exception:
        pass

    print("⚠ Using bounding box approximation for Ourense")
    return ourense_bbox


# ============================================================================
# 3. DATA ACQUISITION — INPUT FEATURES
# ============================================================================

def get_ndvi_layer(region, year):
    """
    Get NDVI (vegetation density) from Sentinel-2 imagery.

    NDVI = (NIR - RED) / (NIR + RED)
    Higher NDVI → denser vegetation → more fuel → higher fire risk.

    Uses fire season composite (June–September) for the given year.
    """
    start_date = f"{year}-06-01"
    end_date = f"{year}-09-30"

    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )

    # Compute NDVI from median composite
    composite = s2.median()
    ndvi = composite.normalizedDifference(["B8", "B4"]).rename("NDVI")

    print(f"✓ NDVI layer computed from Sentinel-2 ({year} fire season)")
    return ndvi


def get_moisture_layer(region, year):
    """
    Get NDMI (Normalized Difference Moisture Index) from Sentinel-2.

    NDMI = (NIR - SWIR) / (NIR + SWIR)
    Lower moisture → drier vegetation → higher fire risk.
    """
    start_date = f"{year}-06-01"
    end_date = f"{year}-09-30"

    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )

    composite = s2.median()
    ndmi = composite.normalizedDifference(["B8", "B11"]).rename("NDMI")

    print(f"✓ Moisture (NDMI) layer computed from Sentinel-2 ({year})")
    return ndmi


def get_lst_layer(region, year):
    """
    Get Land Surface Temperature (LST) from MODIS.

    Higher temperatures → increased fire risk.
    Uses daytime LST from MOD11A1 (1km resolution).
    """
    start_date = f"{year}-06-01"
    end_date = f"{year}-09-30"

    modis_lst = (
        ee.ImageCollection("MODIS/061/MOD11A1")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .select("LST_Day_1km")
    )

    # Convert from Kelvin*0.02 to Celsius
    lst_mean = modis_lst.mean().multiply(0.02).subtract(273.15).rename("LST")

    print(f"✓ LST layer computed from MODIS ({year} fire season)")
    return lst_mean


def get_terrain_layers(region):
    """
    Get slope and aspect from SRTM Digital Elevation Model (30m).

    Slope: Fire spreads faster uphill. Steeper slopes → higher risk.
    Aspect: South-facing slopes (in N hemisphere) receive more sun → drier.
    """
    dem = ee.Image("USGS/SRTMGL1_003")
    slope = ee.Terrain.slope(dem).rename("slope")
    aspect = ee.Terrain.aspect(dem).rename("aspect")
    elevation = dem.rename("elevation")

    print("✓ Terrain layers (slope, aspect, elevation) from SRTM DEM")
    return slope, aspect, elevation


def get_distance_to_roads(region):
    """
    Compute distance to nearest road.
    Roads provide access for both fire ignition and suppression.
    """
    # Using Global Roads Open Access Data Set (gROADS)
    try:
        roads = ee.FeatureCollection("projects/sat-io/open-datasets/GRIP4/grip4_total_TP")
        roads_filtered = roads.filterBounds(region)
        dist_roads = roads_filtered.distance(5000).rename("dist_roads")
        print("✓ Distance to roads layer computed")
        return dist_roads
    except Exception:
        print("⚠ Roads dataset unavailable, using constant placeholder")
        return ee.Image.constant(1000).rename("dist_roads")


def get_distance_to_urban(region):
    """
    Compute distance to nearest urban area.
    Using Global Human Settlement Layer (GHSL).
    """
    try:
        urban = (
            ee.Image("JRC/GHSL/P2023A/GHS_BUILT_S/2020")
            .select("built_surface")
            .gt(0)
        )
        dist_urban = urban.fastDistanceTransform().sqrt().multiply(30).rename("dist_urban")
        print("✓ Distance to urban areas layer computed")
        return dist_urban
    except Exception:
        print("⚠ Urban dataset unavailable, using constant placeholder")
        return ee.Image.constant(5000).rename("dist_urban")


# ============================================================================
# 4. TRAINING LABELS — HISTORICAL FIRE DATA
# ============================================================================

def get_fire_labels(region, start_year=2015, end_year=2023):
    """
    Collect training labels from historical fire events.

    Positive samples (fire=1): Historical fire hotspots from FIRMS archive.
    Negative samples (fire=0): Random points from non-burned areas.

    Uses MODIS burned area product (MCD64A1) + FIRMS active fires.
    """
    # --- Positive samples: burned areas ---
    burned_collection = (
        ee.ImageCollection("MODIS/061/MCD64A1")
        .filterBounds(region)
        .filterDate(f"{start_year}-01-01", f"{end_year}-12-31")
        .select("BurnDate")
    )

    # Create binary burned mask (any pixel that burned at least once)
    burned_mask = burned_collection.max().gt(0).rename("burned")

    # Sample positive points from burned areas
    fire_points = burned_mask.updateMask(burned_mask).stratifiedSample(
        numPoints=500,
        classBand="burned",
        region=region,
        scale=500,
        geometries=True,
    )

    # Add label = 1
    fire_points = fire_points.map(lambda f: f.set("fire", 1))

    # --- Negative samples: non-burned areas ---
    not_burned = burned_mask.Not().selfMask().rename("burned")
    no_fire_points = not_burned.stratifiedSample(
        numPoints=500,
        classBand="burned",
        region=region,
        scale=500,
        geometries=True,
    )

    # Add label = 0
    no_fire_points = no_fire_points.map(lambda f: f.set("fire", 0))

    # Merge positive and negative samples
    training_points = fire_points.merge(no_fire_points)

    total = training_points.size().getInfo()
    print(f"✓ Training labels collected: {total} samples (balanced fire/no-fire)")

    return training_points


# ============================================================================
# 5. FEATURE EXTRACTION
# ============================================================================

def build_feature_stack(region, year=2023):
    """
    Stack all input features into a single multi-band image.
    Each band becomes a feature for the Random Forest model.
    """
    ndvi = get_ndvi_layer(region, year)
    ndmi = get_moisture_layer(region, year)
    lst = get_lst_layer(region, year)
    slope, aspect, elevation = get_terrain_layers(region)
    dist_roads = get_distance_to_roads(region)
    dist_urban = get_distance_to_urban(region)

    # Stack all features into one image
    feature_stack = (
        ndvi.addBands(ndmi)
        .addBands(lst)
        .addBands(slope)
        .addBands(aspect)
        .addBands(elevation)
        .addBands(dist_roads)
        .addBands(dist_urban)
    )

    band_names = feature_stack.bandNames().getInfo()
    print(f"\n✓ Feature stack built: {len(band_names)} bands")
    print(f"  Bands: {band_names}")

    return feature_stack


def extract_training_data(feature_stack, training_points, region):
    """
    Extract feature values at each training point location.
    This creates the (X, y) dataset for the classifier.
    """
    feature_bands = feature_stack.bandNames().getInfo()

    training_data = feature_stack.sampleRegions(
        collection=training_points,
        properties=["fire"],
        scale=30,
        geometries=True,
    )

    count = training_data.size().getInfo()
    print(f"✓ Training data extracted: {count} samples × {len(feature_bands)} features")

    return training_data, feature_bands


# ============================================================================
# 6. MODEL TRAINING
# ============================================================================

def train_random_forest(training_data, feature_bands, n_trees=100):
    """
    Train a Random Forest classifier in Google Earth Engine.

    Parameters:
        training_data: ee.FeatureCollection with features and 'fire' label
        feature_bands: list of band names to use as input features
        n_trees: number of trees in the forest (default: 100)

    Returns:
        trained classifier
    """
    # Split into train (70%) and test (30%)
    training_data = training_data.randomColumn("random", seed=42)
    train_set = training_data.filter(ee.Filter.lt("random", 0.7))
    test_set = training_data.filter(ee.Filter.gte("random", 0.7))

    train_count = train_set.size().getInfo()
    test_count = test_set.size().getInfo()
    print(f"\n--- Model Training ---")
    print(f"  Train set: {train_count} samples")
    print(f"  Test set:  {test_count} samples")
    print(f"  Trees:     {n_trees}")
    print(f"  Features:  {len(feature_bands)}")

    # Train the Random Forest
    classifier = ee.Classifier.smileRandomForest(
        numberOfTrees=n_trees
    ).train(
        features=train_set,
        classProperty="fire",
        inputProperties=feature_bands,
    )

    print(f"✓ Random Forest trained successfully")

    return classifier, train_set, test_set


# ============================================================================
# 7. MODEL EVALUATION
# ============================================================================

def evaluate_model(classifier, test_set, feature_bands):
    """
    Evaluate model performance on the held-out test set.

    Metrics:
        - Overall accuracy
        - Confusion matrix
        - Producer's / User's accuracy per class
        - Kappa coefficient
    """
    print(f"\n--- Model Evaluation ---")

    # Classify test set
    classified = test_set.classify(classifier)

    # Confusion matrix
    confusion = classified.errorMatrix("fire", "classification")
    accuracy = confusion.accuracy().getInfo()
    kappa = confusion.kappa().getInfo()
    matrix = confusion.array().getInfo()

    producers = confusion.producersAccuracy().getInfo()
    consumers = confusion.consumersAccuracy().getInfo()

    print(f"  Overall Accuracy: {accuracy:.3f}")
    print(f"  Kappa:            {kappa:.3f}")
    print(f"  Confusion Matrix: {matrix}")
    print(f"  Producer's Acc:   {producers}")
    print(f"  Consumer's Acc:   {consumers}")

    # AUC-ROC approximation using probability mode
    try:
        classifier_prob = ee.Classifier.smileRandomForest(100).setOutputMode("PROBABILITY").train(
            features=test_set,
            classProperty="fire",
            inputProperties=feature_bands,
        )
        # Note: Exact AUC requires external computation (e.g., in Python with sklearn)
        print(f"\n  ℹ For exact AUC-ROC, export predictions and compute with sklearn")
        print(f"    Target AUC: >= 0.80 (reference paper achieved 0.835)")
    except Exception:
        pass

    return {
        "accuracy": accuracy,
        "kappa": kappa,
        "confusion_matrix": matrix,
    }


def get_variable_importance(classifier, feature_bands):
    """
    Extract and display variable importance from the Random Forest.
    Shows which features contribute most to fire risk prediction.
    """
    print(f"\n--- Variable Importance ---")

    importance = classifier.explain().get("importance").getInfo()

    # Sort by importance
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)

    for i, (band, imp) in enumerate(sorted_importance):
        bar = "█" * int(imp / max(importance.values()) * 30)
        print(f"  {i+1}. {band:15s} {imp:8.2f}  {bar}")

    return dict(sorted_importance)


# ============================================================================
# 8. PREDICTION MAP GENERATION
# ============================================================================

def generate_risk_map(classifier, feature_stack, region):
    """
    Apply the trained model to classify every pixel in Ourense.

    Output: Probability map (0–1) representing fire susceptibility.
    """
    # Use probability mode for continuous risk scores
    classifier_prob = classifier.setOutputMode("PROBABILITY")

    # Classify the entire region
    risk_map = feature_stack.classify(classifier_prob).rename("fire_risk")

    # Clip to study area
    risk_map = risk_map.clip(region)

    print(f"\n✓ Fire risk prediction map generated for Ourense")
    return risk_map


def classify_risk_levels(risk_map):
    """
    Convert continuous probability to traffic-light risk levels.

    0.00 – 0.25 → Low (Green)
    0.25 – 0.50 → Medium (Yellow)
    0.50 – 0.75 → High (Orange)
    0.75 – 1.00 → Critical (Red)
    """
    risk_classified = (
        risk_map.where(risk_map.lte(0.25), 1)  # Low
        .where(risk_map.gt(0.25).And(risk_map.lte(0.50)), 2)  # Medium
        .where(risk_map.gt(0.50).And(risk_map.lte(0.75)), 3)  # High
        .where(risk_map.gt(0.75), 4)  # Critical
    ).rename("risk_level")

    print("✓ Risk levels classified (1=Low, 2=Medium, 3=High, 4=Critical)")
    return risk_classified


# ============================================================================
# 9. EXPORT RESULTS
# ============================================================================

def export_risk_map(risk_map, region, filename="ourense_fire_risk"):
    """
    Export the fire risk map as a GeoTIFF to Google Drive.
    This file can then be loaded into the web dashboard.
    """
    task = ee.batch.Export.image.toDrive(
        image=risk_map,
        description=filename,
        folder="FireWatchOurense",
        region=region,
        scale=30,
        crs="EPSG:4326",
        maxPixels=1e10,
        fileFormat="GeoTIFF",
    )
    task.start()
    print(f"\n✓ Export task started: {filename}")
    print(f"  Check progress at: https://code.earthengine.google.com/tasks")
    return task


def export_zone_stats(risk_map, region):
    """
    Compute mean fire risk per administrative zone and export as JSON.
    This feeds directly into the dashboard's zone list.
    """
    # Define monitoring zones (same as dashboard mock data)
    zones = {
        "Serra de San Mamede": ee.Geometry.Rectangle([-7.97, 42.28, -7.9, 42.32]),
        "Ribeira Sacra": ee.Geometry.Rectangle([-7.75, 42.38, -7.68, 42.42]),
        "Baixa Limia": ee.Geometry.Rectangle([-8.12, 41.95, -8.05, 42.0]),
        "Macizo Central": ee.Geometry.Rectangle([-7.87, 42.2, -7.8, 42.25]),
        "Val do Arnoia": ee.Geometry.Rectangle([-8.07, 42.18, -8.0, 42.22]),
        "Serra do Invernadeiro": ee.Geometry.Rectangle([-7.57, 42.12, -7.5, 42.17]),
        "Celanova": ee.Geometry.Rectangle([-8.0, 42.14, -7.94, 42.18]),
        "Verin": ee.Geometry.Rectangle([-7.47, 41.93, -7.4, 41.98]),
    }

    zone_stats = {}
    for name, geometry in zones.items():
        try:
            mean_risk = risk_map.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=30,
                maxPixels=1e8,
            ).get("fire_risk").getInfo()

            zone_stats[name] = round(mean_risk, 3) if mean_risk else 0
        except Exception:
            zone_stats[name] = 0

    print(f"\n--- Zone Risk Scores ---")
    for name, score in sorted(zone_stats.items(), key=lambda x: x[1], reverse=True):
        level = (
            "CRITICAL" if score > 0.75
            else "HIGH" if score > 0.50
            else "MEDIUM" if score > 0.25
            else "LOW"
        )
        print(f"  {name:25s}  {score:.3f}  [{level}]")

    return zone_stats


# ============================================================================
# 10. MAIN PIPELINE
# ============================================================================

def main():
    """
    Full training pipeline:
    1. Initialize GEE
    2. Define study area (Ourense)
    3. Collect training labels (historical fires)
    4. Build feature stack (NDVI, moisture, LST, slope, aspect, elevation)
    5. Extract training data
    6. Train Random Forest (100 trees)
    7. Evaluate (accuracy, confusion matrix, variable importance)
    8. Generate fire risk prediction map
    9. Export results (GeoTIFF + zone statistics)
    """
    print("=" * 60)
    print("  Fire Watch Ourense — ML Training Pipeline")
    print("  Random Forest Fire Susceptibility Model")
    print("=" * 60)
    print()

    # 1. Initialize
    initialize_gee()

    # 2. Study area
    print("\n[Step 1/7] Defining study area...")
    region = get_ourense_boundary()

    # 3. Training labels
    print("\n[Step 2/7] Collecting training labels (2015–2023)...")
    training_points = get_fire_labels(region, start_year=2015, end_year=2023)

    # 4. Feature stack
    print("\n[Step 3/7] Building feature stack (2023 fire season)...")
    feature_stack = build_feature_stack(region, year=2023)

    # 5. Extract training data
    print("\n[Step 4/7] Extracting training data at sample points...")
    training_data, feature_bands = extract_training_data(
        feature_stack, training_points, region
    )

    # 6. Train model
    print("\n[Step 5/7] Training Random Forest classifier...")
    classifier, train_set, test_set = train_random_forest(
        training_data, feature_bands, n_trees=100
    )

    # 7. Evaluate
    print("\n[Step 6/7] Evaluating model...")
    metrics = evaluate_model(classifier, test_set, feature_bands)
    importance = get_variable_importance(classifier, feature_bands)

    # 8. Generate prediction map
    print("\n[Step 7/7] Generating fire risk prediction map...")
    risk_map = generate_risk_map(classifier, feature_stack, region)
    risk_classified = classify_risk_levels(risk_map)

    # 9. Export
    print("\n--- Exporting Results ---")
    export_risk_map(risk_map, region, "ourense_fire_risk_probability")
    export_risk_map(risk_classified, region, "ourense_fire_risk_levels")

    # 10. Zone statistics
    zone_stats = export_zone_stats(risk_map, region)

    # Save zone stats as JSON for the dashboard
    output_path = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "model-output.json")
    with open(output_path, "w") as f:
        json.dump({
            "model": "RandomForest",
            "n_trees": 100,
            "accuracy": metrics["accuracy"],
            "kappa": metrics["kappa"],
            "feature_importance": importance,
            "zone_risk_scores": zone_stats,
            "training_period": "2015-2023",
            "prediction_year": 2023,
            "generated_at": datetime.now().isoformat(),
        }, f, indent=2)

    print(f"\n✓ Model output saved to {output_path}")

    print("\n" + "=" * 60)
    print("  Pipeline complete!")
    print(f"  Accuracy: {metrics['accuracy']:.3f}")
    print(f"  Check exports at: https://code.earthengine.google.com/tasks")
    print("=" * 60)


if __name__ == "__main__":
    main()
