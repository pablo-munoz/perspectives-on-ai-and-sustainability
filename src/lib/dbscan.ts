/**
 * Tiny DBSCAN tailored for FIRMS-style point clustering.
 *
 * Distance metric is custom: spatial haversine in km AND temporal delta
 * in hours. Two points are "neighbors" iff both are within eps (km) AND
 * within tau (hours).
 */

import { haversineKm } from "./geo";

export interface SpatioTemporalPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface DbscanOptions {
  /** Spatial radius in km (default 2). */
  epsKm?: number;
  /** Temporal radius in hours (default 48). */
  tauHours?: number;
  /** Minimum cluster seed size (default 2). */
  minPts?: number;
}

const NOISE = -1;
const UNCLASSIFIED = -2;

export function dbscan<T extends SpatioTemporalPoint>(
  points: T[],
  opts: DbscanOptions = {}
): number[] {
  const epsKm = opts.epsKm ?? 2;
  const tauMs = (opts.tauHours ?? 48) * 3600_000;
  const minPts = opts.minPts ?? 2;
  const labels = new Array<number>(points.length).fill(UNCLASSIFIED);
  let nextCluster = 0;

  const ts = points.map((p) => new Date(p.timestamp).getTime());

  const neighbors = (i: number): number[] => {
    const out: number[] = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      if (Math.abs(ts[i] - ts[j]) > tauMs) continue;
      if (
        haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng) <= epsKm
      ) {
        out.push(j);
      }
    }
    return out;
  };

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== UNCLASSIFIED) continue;
    const seeds = neighbors(i);
    if (seeds.length + 1 < minPts) {
      labels[i] = NOISE;
      continue;
    }
    const c = nextCluster++;
    labels[i] = c;
    const queue = [...seeds];
    while (queue.length) {
      const j = queue.shift()!;
      if (labels[j] === NOISE) labels[j] = c;
      if (labels[j] !== UNCLASSIFIED) continue;
      labels[j] = c;
      const more = neighbors(j);
      if (more.length + 1 >= minPts) queue.push(...more);
    }
  }

  return labels;
}

/**
 * Convenience: group input points by their DBSCAN cluster label.
 * Returns one array per cluster (noise points filtered out).
 */
export function groupByCluster<T extends SpatioTemporalPoint>(
  points: T[],
  labels: number[]
): T[][] {
  const buckets = new Map<number, T[]>();
  for (let i = 0; i < points.length; i++) {
    if (labels[i] === NOISE) continue;
    const arr = buckets.get(labels[i]) ?? [];
    arr.push(points[i]);
    buckets.set(labels[i], arr);
  }
  return [...buckets.values()];
}
