// SCIP AI/ML Foundation - Spatio-Temporal Incident Clustering Engine
// Implements DBSCAN-inspired clustering combining spatial distance (Haversine), temporal delta, and semantic TF-IDF similarity.
// Adheres strictly to the Responsible AI principle:
// "A community report is an observation. An AI-generated incident is an analytical interpretation."

import { Report, SpatioTemporalCluster, IncidentSeverity, IncidentPriority } from '../types/scip';
import { calculateHaversineDistance, calculateTimeDeltaHours } from './duplicateDetector';
import { globalVectorizer } from './tfidf';

export interface ClusteringConfig {
  maxSpatialDistanceMeters: number; // eps_spatial, default 500m
  maxTemporalDeltaHours: number;   // eps_temporal, default 48h
  minSemanticSimilarity: number;   // min cosine similarity, default 0.35
  minClusterSize: number;          // Min reports to trigger incident proposal, default 2
}
export const ClusteringConfig = {} as any;

const DEFAULT_CONFIG: ClusteringConfig = {
  maxSpatialDistanceMeters: 550,
  maxTemporalDeltaHours: 48,
  minSemanticSimilarity: 0.32,
  minClusterSize: 2
};

/**
 * Perform Spatio-Temporal DBSCAN clustering across reports.
 */
export function detectIncidentClusters(
  reports: Report[],
  config: Partial<ClusteringConfig> = {}
): SpatioTemporalCluster[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Filter only active / unclosed reports
  const activeReports = reports.filter(r => r.status !== 'resolved' && r.status !== 'closed');
  if (activeReports.length < cfg.minClusterSize) return [];

  // Pre-calculate TF-IDF vectors for active reports
  const vectors = new Map<string, any>();
  for (const rep of activeReports) {
    vectors.set(rep.id, globalVectorizer.transform(`${rep.title} ${rep.description} ${rep.category}`, rep.id));
  }

  // Build adjacency graph based on spatio-temporal and semantic connectivity
  const neighborsMap = new Map<string, string[]>();

  for (let i = 0; i < activeReports.length; i++) {
    const repA = activeReports[i];
    const neighbors: string[] = [];

    for (let j = 0; j < activeReports.length; j++) {
      if (i === j) continue;
      const repB = activeReports[j];

      // 1. Spatial distance check
      const dist = calculateHaversineDistance(repA.latitude, repA.longitude, repB.latitude, repB.longitude);
      if (dist > cfg.maxSpatialDistanceMeters) continue;

      // 2. Temporal distance check
      const timeDelta = calculateTimeDeltaHours(repA.createdAt, repB.createdAt);
      if (timeDelta > cfg.maxTemporalDeltaHours) continue;

      // 3. Semantic similarity check (or cross-domain incident relationship)
      const vecA = vectors.get(repA.id);
      const vecB = vectors.get(repB.id);
      const sim = globalVectorizer.cosineSimilarity(vecA, vecB);

      // Related category cascade (e.g. Water & Drainage related to Roads & Traffic flooding)
      const isRelatedDomain =
        repA.category === repB.category ||
        (repA.category === 'Water & Drainage' && repB.category === 'Roads & Traffic') ||
        (repA.category === 'Roads & Traffic' && repB.category === 'Water & Drainage') ||
        (repA.category === 'Power & Lighting' && repB.category === 'Public Sanitation');

      if (sim >= cfg.minSemanticSimilarity || (dist <= 250 && isRelatedDomain)) {
        neighbors.push(repB.id);
      }
    }

    neighborsMap.set(repA.id, neighbors);
  }

  // DBSCAN clustering traversal
  const visited = new Set<string>();
  const rawClusters: string[][] = [];

  for (const rep of activeReports) {
    if (visited.has(rep.id)) continue;
    visited.add(rep.id);

    const neighbors = neighborsMap.get(rep.id) || [];
    if (neighbors.length < cfg.minClusterSize - 1) {
      // Noise / single observation
      continue;
    }

    // Expand cluster
    const cluster = [rep.id];
    const queue = [...neighbors];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const currentNeighbors = neighborsMap.get(currentId) || [];
        if (currentNeighbors.length >= cfg.minClusterSize - 1) {
          for (const nId of currentNeighbors) {
            if (!queue.includes(nId) && !cluster.includes(nId)) {
              queue.push(nId);
            }
          }
        }
      }
      if (!cluster.includes(currentId)) {
        cluster.push(currentId);
      }
    }

    if (cluster.length >= cfg.minClusterSize) {
      rawClusters.push(cluster);
    }
  }

  // Format clusters into structured SpatioTemporalCluster objects
  const clusters: SpatioTemporalCluster[] = [];
  const reportsById = new Map(activeReports.map(r => [r.id, r]));

  rawClusters.forEach((clusterReportIds, index) => {
    const clusterReports = clusterReportIds
      .map(id => reportsById.get(id))
      .filter((r): r is Report => Boolean(r));

    if (clusterReports.length === 0) return;

    // Centroid calculation
    const avgLat = clusterReports.reduce((sum, r) => sum + r.latitude, 0) / clusterReports.length;
    const avgLng = clusterReports.reduce((sum, r) => sum + r.longitude, 0) / clusterReports.length;

    // Radius calculation (max distance to centroid)
    let maxDist = 0;
    for (const r of clusterReports) {
      const d = calculateHaversineDistance(avgLat, avgLng, r.latitude, r.longitude);
      if (d > maxDist) maxDist = d;
    }
    const radiusMeters = Math.max(80, Math.round(maxDist));

    // Majority category
    const catCounts = new Map<string, number>();
    for (const r of clusterReports) {
      catCounts.set(r.category, (catCounts.get(r.category) || 0) + 1);
    }
    const primaryCategory = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] as any;

    // Time span
    const timestamps = clusterReports.map(r => new Date(r.createdAt).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeSpanHours = Number(((maxTime - minTime) / (1000 * 60 * 60)).toFixed(1));

    // Derive Severity and Priority
    const hasCritical = clusterReports.some(r => r.urgency === 'critical');
    const hasHigh = clusterReports.some(r => r.urgency === 'high');
    const severity: IncidentSeverity = hasCritical
      ? 'critical'
      : hasHigh || clusterReports.length >= 4
      ? 'high'
      : clusterReports.length >= 3
      ? 'medium'
      : 'low';

    const priority: IncidentPriority =
      severity === 'critical'
        ? 'P1_CRITICAL'
        : severity === 'high'
        ? 'P2_HIGH'
        : severity === 'medium'
        ? 'P3_MEDIUM'
        : 'P4_LOW';

    // Confidence metric (based on report count, density, and semantic coherence)
    const densityConfidence = Math.min(0.95, 0.65 + clusterReports.length * 0.08);

    // Formulate suggested title based on primary location and category
    const primaryLocation = clusterReports[0].locationName;
    const suggestedTitle = `Potential Incident: Concentrated ${primaryCategory} Reports at ${primaryLocation}`;

    // Explainable evidence list
    const evidence: string[] = [
      `${clusterReports.length} related community observations submitted within ${radiusMeters}m radius`,
      `Temporal correlation: Reported across a ${timeSpanHours || 0.5}-hour window`,
      `Primary location: ${primaryLocation}`,
      `Correlated observations: ${clusterReports.map(r => `"${r.title}"`).slice(0, 3).join(', ')}`
    ];

    clusters.push({
      clusterId: `CLUSTER-${String(index + 1).padStart(3, '0')}`,
      category: primaryCategory,
      centroid: {
        latitude: Number(avgLat.toFixed(6)),
        longitude: Number(avgLng.toFixed(6))
      },
      radiusMeters,
      reportIds: clusterReportIds,
      reportCount: clusterReports.length,
      suggestedTitle,
      severity,
      priority,
      confidence: Number(densityConfidence.toFixed(2)),
      evidence,
      timeSpanHours
    });
  });

  return clusters;
}
