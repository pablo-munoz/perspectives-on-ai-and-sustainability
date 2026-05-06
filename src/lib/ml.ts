/**
 * Pure-TS Random Forest predictor.
 *
 * Loads a serialized RF (one decision tree per element of `trees`) and walks
 * each tree node-by-node. The result is the mean class-1 probability across
 * trees — equivalent to sklearn's `RandomForestClassifier.predict_proba(x)[:,1]`.
 *
 * The serialized format is produced by `ml/train_and_export.py::export_trees_json`.
 *
 * Why JSON trees instead of ONNX:
 *   skl2onnx 1.18 + onnx 1.17 + sklearn 1.5 has a known TreeEnsembleClassifier
 *   attribute encoding bug. JSON is bulletproof and avoids native deps.
 */

import treesData from "./ml/trees.json";
import zoneFeatures from "./ml/zone-features.json";
import featureCols from "./ml/feature-columns.json";

interface SerializedTree {
  feature: number[]; // -2 = leaf
  threshold: number[];
  left: number[]; // -1 = leaf
  right: number[];
  leaf_prob: number[]; // probability of class 1 at each node (only valid for leaves)
}

interface SerializedRF {
  format: string;
  n_features: number;
  feature_order: string[];
  n_trees: number;
  trees: SerializedTree[];
}

interface ZoneFeatureRecord {
  name: string;
  features: Record<string, number>;
}

const RF: SerializedRF = treesData as SerializedRF;
const ZONE_FEATURES: Record<string, ZoneFeatureRecord> = zoneFeatures as Record<
  string,
  ZoneFeatureRecord
>;
const FEATURE_ORDER: string[] = featureCols as string[];

if (RF.format !== "fire-see-rf-v1") {
  throw new Error(`Unsupported RF format: ${RF.format}`);
}
if (RF.feature_order.length !== FEATURE_ORDER.length) {
  throw new Error("Feature order mismatch between trees.json and feature-columns.json");
}

/**
 * Walk a single tree to a leaf and return its class-1 probability.
 *
 * Implements the standard sklearn decision tree comparison:
 *   if x[feature[node]] <= threshold[node]: go left  else: go right
 */
function walkTree(tree: SerializedTree, x: number[]): number {
  let node = 0;
  // Bounded loop — sklearn trees are finite. Cap at 10k just in case of corrupt data.
  for (let i = 0; i < 10000; i++) {
    const f = tree.feature[node];
    if (f === -2) return tree.leaf_prob[node];
    node = x[f] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
  }
  throw new Error("walkTree exceeded depth — corrupt tree?");
}

/**
 * Predict probability of fire (class 1) for a single feature vector.
 * Vector must be ordered according to FEATURE_ORDER.
 */
export function predictProba(x: number[]): number {
  if (x.length !== RF.n_features) {
    throw new Error(`Expected ${RF.n_features} features, got ${x.length}`);
  }
  let sum = 0;
  for (const tree of RF.trees) sum += walkTree(tree, x);
  return sum / RF.n_trees;
}

/**
 * Build the ordered feature vector from a name→value record.
 * Missing keys default to 0 (the same as sklearn behaviour for the placeholder
 * `dist_roads` feature when GRIP4 is unavailable).
 */
export function buildFeatureVector(features: Record<string, number>): number[] {
  return FEATURE_ORDER.map((name) => {
    const v = features[name];
    return Number.isFinite(v) ? v : 0;
  });
}

export interface ZonePrediction {
  zoneId: string;
  zoneName: string;
  baseScore: number;
  features: Record<string, number>;
}

/**
 * Predict baseline scores for all 8 zones using their static (training-time)
 * feature vectors. Phase C will plumb live features into this same pipeline.
 */
export function predictAllZonesStatic(): ZonePrediction[] {
  return Object.entries(ZONE_FEATURES).map(([zoneId, rec]) => {
    const x = buildFeatureVector(rec.features);
    return {
      zoneId,
      zoneName: rec.name,
      baseScore: predictProba(x),
      features: rec.features,
    };
  });
}

/**
 * Override one or more features for a specific zone (e.g. live LST from AEMET)
 * before running inference. Returns the updated baseline score.
 */
export function predictZoneWithOverrides(
  zoneId: string,
  overrides: Record<string, number>
): number {
  const rec = ZONE_FEATURES[zoneId];
  if (!rec) throw new Error(`Unknown zone: ${zoneId}`);
  const merged: Record<string, number> = { ...rec.features, ...overrides };
  return predictProba(buildFeatureVector(merged));
}

export const FEATURE_NAMES = FEATURE_ORDER;
export const N_TREES = RF.n_trees;
