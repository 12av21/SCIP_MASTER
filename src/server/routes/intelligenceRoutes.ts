// SCIP Backend - Intelligence & Analytical Pipelines Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { SCIPIntelligenceAgent } from '../../ai/scipAgent.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';

const router = Router();

// Helper to instantiate agent with active database snapshot
function getAgentInstance(): SCIPIntelligenceAgent {
  const reports = db.getReports();
  const incidents = db.getIncidents();
  return new SCIPIntelligenceAgent({ reports, incidents });
}

// POST /api/intelligence/agent
// Executes multi-tool intelligence request with transparency & uncertainty disclaimers
router.post(
  '/agent',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { query, specificTool } = req.body;
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'An intelligence query or intent prompt is required.'
        });
        return;
      }

      const agent = getAgentInstance();
      const briefing = agent.executeIntelligenceQuery(query, specificTool);

      res.json({
        success: true,
        data: briefing
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Agent execution failed.',
        errors: [err.message]
      });
    }
  }
);

// GET /api/intelligence/clusters
// Runs Spatio-Temporal DBSCAN clustering across reports
router.get(
  '/clusters',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const reports = db.getReports();
      const clusters = detectIncidentClusters(reports);

      res.json({
        success: true,
        data: clusters,
        meta: {
          totalClusters: clusters.length,
          clusteredReportsCount: clusters.reduce((acc, c) => acc + c.reportCount, 0)
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute incident clusters.',
        errors: [err.message]
      });
    }
  }
);

// GET /api/intelligence/hotspots
router.get(
  '/hotspots',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const reports = db.getReports();

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
  }
);

// GET /api/intelligence/trends
router.get(
  '/trends',
  authenticate,
  requirePermission('analytics.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const reports = db.getReports();
    const incidents = db.getIncidents();

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
  }
);

export default router;
