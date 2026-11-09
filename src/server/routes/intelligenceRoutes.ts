// SCIP Backend - Intelligence & Analytical Pipelines Routes

import { Router, Response } from 'express';
import { getDb } from '../../database/initMongo.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { SCIPIntelligenceAgent } from '../../ai/scipAgent.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';
import { aiAgentRateLimiter, validateBody, aiAgentQuerySchema } from '../middleware/security.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { Incident, Report } from '../../types/scip.js';

const router = Router();

// Helper to instantiate agent with active database snapshot
async function loadAllReports(): Promise<Report[]> {
  const reports: Report[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await getDb().getReports(undefined, { skip, limit: 100 });
    reports.push(...page);
    if (page.length < 100) return reports;
  }
}

async function loadAllIncidents(): Promise<Incident[]> {
  const incidents: Incident[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await getDb().getIncidents(undefined, { skip, limit: 100 });
    incidents.push(...page);
    if (page.length < 100) return incidents;
  }
}

async function getAgentInstance(): Promise<SCIPIntelligenceAgent> {
  const [reports, incidents] = await Promise.all([loadAllReports(), loadAllIncidents()]);
  return new SCIPIntelligenceAgent({ reports, incidents });
}

// POST /api/intelligence/agent
// Executes multi-tool intelligence request with transparency & uncertainty disclaimers
router.post(
  '/agent',
  aiAgentRateLimiter,
  authenticate,
  requirePermission('intelligence.read'),
  validateBody(aiAgentQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { query, specificTool } = req.body;

      const agent = await getAgentInstance();
      const briefing = agent.executeIntelligenceQuery(query, specificTool);

      res.json({
        success: true,
        data: briefing
      });
    } catch (error) {
      console.error(`[SCIP] Intelligence agent request failed (${error instanceof Error ? error.name : 'UnknownError'}).`);
      res.status(500).json({
        success: false,
        message: 'Agent execution failed.',
        errors: ['An unexpected error occurred']
      });
    }
  })
);

// GET /api/intelligence/clusters
// Runs Spatio-Temporal DBSCAN clustering across reports
router.get(
  '/clusters',
  authenticate,
  requirePermission('intelligence.read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reports = await loadAllReports();
      const clusters = detectIncidentClusters(reports);

      res.json({
        success: true,
        data: clusters,
        meta: {
          totalClusters: clusters.length,
          clusteredReportsCount: clusters.reduce((acc, c) => acc + c.reportCount, 0)
        }
      });
    } catch (error) {
      console.error(`[SCIP] Cluster computation failed (${error instanceof Error ? error.name : 'UnknownError'}).`);
      res.status(500).json({
        success: false,
        message: 'Failed to compute incident clusters.',
        errors: ['An unexpected error occurred']
      });
    }
  })
);

// GET /api/intelligence/hotspots
router.get(
  '/hotspots',
  authenticate,
  requirePermission('intelligence.read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reports = await loadAllReports();

    // Group reports by primary location or geo-bins
    const locationMap = new Map<string, { count: number; lat: number; lng: number; categories: Set<string>; reports: string[] }>();

    for (const r of reports) {
      const key = r.locationName;
      const existing = locationMap.get(key) || {
        count: 0,
        lat: r.latitude,
        lng: r.longitude,
        categories: new Set(),
        reports: []
      };
      existing.count += 1;
      existing.categories.add(r.category);
      existing.reports.push(r.id);
      locationMap.set(key, existing);
    }

    const hotspots = Array.from(locationMap.entries()).map(([location, data]) => ({
      location,
      latitude: data.lat,
      longitude: data.lng,
      reportCount: data.count,
      categories: Array.from(data.categories),
      densityIndex: Math.min(100, data.count * 20),
      isHighRisk: data.count >= 3
    })).sort((a, b) => b.reportCount - a.reportCount);

    res.json({
      success: true,
      data: hotspots
    });
  })
);

// GET /api/intelligence/trends
router.get(
  '/trends',
  authenticate,
  requirePermission('analytics.read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [reports, incidents] = await Promise.all([loadAllReports(), loadAllIncidents()]);

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const r of reports) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const r of reports) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    // Daily volume
    const dailyVolume: Record<string, number> = {};
    for (const r of reports) {
      const dateKey = r.createdAt.split('T')[0];
      dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + 1;
    }

    // Incident status breakdown
    const incidentStatusCounts: Record<string, number> = {};
    for (const i of incidents) {
      incidentStatusCounts[i.status] = (incidentStatusCounts[i.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalReports: reports.length,
        totalIncidents: incidents.length,
        activeIncidents: incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed').length,
        potentialIncidents: incidents.filter(i => i.status === 'potential').length,
        categoryCounts,
        statusCounts,
        dailyVolume,
        incidentStatusCounts
      }
    });
  })
);

export default router;
